import os
import re
import shutil
import subprocess
from datetime import date as date_cls

from django.conf import settings
from django.utils import timezone
from PIL import Image

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False


def make_stored_name(display_name: str) -> str:
    """Create a filesystem-safe filename from the user-defined name."""
    if '.' in display_name:
        name, ext = display_name.rsplit('.', 1)
        ext = '.' + ext.lower().strip()
    else:
        name, ext = display_name, ''

    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    name = name.strip('_') or 'file'
    return name + ext


def detect_mime_type(uploaded_file) -> str:
    """Detect MIME type using python-magic with fallback."""
    if MAGIC_AVAILABLE:
        try:
            header = uploaded_file.read(2048)
            uploaded_file.seek(0)
            return magic.from_buffer(header, mime=True)
        except Exception:
            pass
    return getattr(uploaded_file, 'content_type', None) or 'application/octet-stream'


def get_thumbnail_path(file_id: int) -> str:
    return os.path.join(settings.THUMBNAIL_DIR, f"{file_id}.jpg")


def has_thumbnail(file_id: int) -> bool:
    return os.path.exists(get_thumbnail_path(file_id))


def generate_thumbnail(file_record, full_path: str) -> None:
    """Generate thumbnail for images and videos. Never raises — non-critical."""
    os.makedirs(settings.THUMBNAIL_DIR, exist_ok=True)
    thumb_path = get_thumbnail_path(file_record.id)
    mime = file_record.mime_type

    try:
        if mime.startswith("image/"):
            with Image.open(full_path) as img:
                img.thumbnail((300, 300))
                img.convert("RGB").save(thumb_path, "JPEG", quality=85)

        elif mime.startswith("video/"):
            subprocess.run(
                [
                    "ffmpeg", "-i", full_path,
                    "-vframes", "1",
                    "-vf", "scale=300:-1",
                    "-y", thumb_path,
                ],
                capture_output=True,
                timeout=30,
            )
    except Exception:
        pass


def check_conflict(project, directory_type: str, date_str: str, stored_name: str) -> bool:
    """Check if a file already exists at the target path."""
    from projects.services import get_directory_path
    dir_path = get_directory_path(project, directory_type, date_str)
    return os.path.exists(os.path.join(dir_path, stored_name))


def save_file(
    project,
    directory_type: str,
    date_str: str,
    display_name: str,
    stored_name: str,
    uploaded_file,
    user,
    mention_user_ids: list,
    overwrite: bool = False,
):
    from django.contrib.auth import get_user_model
    from files.models import FileRecord
    from notifications.models import Mention, Notification
    from projects.services import ensure_date_directory, get_directory_path

    User = get_user_model()
    mime_type = detect_mime_type(uploaded_file)

    # Ensure target directory exists
    if directory_type in ("date", "edit"):
        dir_path = ensure_date_directory(project, directory_type, date_str)
    else:
        dir_path = get_directory_path(project, directory_type)
        os.makedirs(dir_path, exist_ok=True)

    full_path = os.path.join(dir_path, stored_name)
    relative_path = os.path.relpath(full_path, settings.STORAGE_ROOT)
    parsed_date = date_cls.fromisoformat(date_str) if date_str else None

    # Write file to disk
    with open(full_path, 'wb+') as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    # Overwrite: update existing FileRecord
    if overwrite:
        existing = FileRecord.objects.filter(
            project=project,
            directory_type=directory_type,
            date_directory=parsed_date,
            stored_name=stored_name,
            is_deleted=False,
        ).first()

        if existing:
            existing.display_name = display_name
            existing.file_size = uploaded_file.size
            existing.mime_type = mime_type
            existing.uploaded_by = user
            existing.uploaded_at = timezone.now()
            existing.save()
            generate_thumbnail(existing, full_path)
            file_record = existing
        else:
            overwrite = False  # no existing record, create new one

    if not overwrite:
        file_record = FileRecord.objects.create(
            project=project,
            display_name=display_name,
            stored_name=stored_name,
            relative_path=relative_path,
            directory_type=directory_type,
            date_directory=parsed_date,
            file_size=uploaded_file.size,
            mime_type=mime_type,
            uploaded_by=user,
        )
        generate_thumbnail(file_record, full_path)

    # Create mentions + notifications
    if mention_user_ids:
        for mentioned_user in User.objects.filter(id__in=mention_user_ids):
            if mentioned_user != user:
                mention = Mention.objects.create(
                    file=file_record,
                    mentioned_user=mentioned_user,
                    mentioned_by=user,
                )
                Notification.objects.create(
                    user=mentioned_user,
                    mention=mention,
                )

    return file_record


def soft_delete_file(file_record) -> None:
    """Move file to project .trash and mark record as deleted."""
    full_path = os.path.join(settings.STORAGE_ROOT, file_record.relative_path)

    if os.path.exists(full_path):
        trash_dir = os.path.join(file_record.project.get_full_path(), ".trash")
        os.makedirs(trash_dir, exist_ok=True)
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        trash_path = os.path.join(trash_dir, f"{timestamp}_{file_record.stored_name}")
        shutil.move(full_path, trash_path)  # shutil handles cross-filesystem moves

    file_record.is_deleted = True
    file_record.deleted_at = timezone.now()
    file_record.save()


def serialize_file(file_record) -> dict:
    """Convert a FileRecord to a dict matching FileOut schema."""
    return {
        "id": file_record.id,
        "display_name": file_record.display_name,
        "stored_name": file_record.stored_name,
        "file_size": file_record.file_size,
        "mime_type": file_record.mime_type,
        "directory_type": file_record.directory_type,
        "date_directory": file_record.date_directory,
        "uploaded_by_email": file_record.uploaded_by.email if file_record.uploaded_by else None,
        "uploaded_by_name": file_record.uploaded_by.full_name if file_record.uploaded_by else None,
        "uploaded_at": file_record.uploaded_at,
        "has_thumbnail": has_thumbnail(file_record.id),
    }