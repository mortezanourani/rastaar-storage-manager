from ninja import Router, File, Form
from ninja.files import UploadedFile
from ninja.errors import HttpError
from typing import Optional, List
from datetime import date as date_cls
from django.shortcuts import get_object_or_404
from django.http import FileResponse
from django.conf import settings
import os

from projects.models import Project
from files.models import FileRecord
from .schemas import (
    ConflictCheckInput, ConflictCheckResponse,
    FileOut, ProjectStructureOut, MessageResponse, CreateDirectoryInput
)
from .services import (
    make_stored_name, check_conflict, save_file,
    soft_delete_file, serialize_file,
    get_thumbnail_path, has_thumbnail,
)
from projects.services import (
    list_date_directories, list_edit_date_directories,
    directory_exists, list_subdirectories, validate_directory_name,
)
from users.permissions import (
    check_project_member, check_directory_access,
    check_can_delete, get_project_role,
)

router = Router()


def get_accessible_project(user, project_id: int) -> Project:
    check_project_member(user, project_id)
    return get_object_or_404(Project, id=project_id, is_active=True)


# ─── STRUCTURE ───────────────────────────────────────────────────────


@router.get("/projects/{project_id}/structure", response=ProjectStructureOut)
def get_project_structure(request, project_id: int):
    project   = get_accessible_project(request.auth, project_id)
    user_role = get_project_role(request.auth, project_id)
    can_see_edit = user_role in ("manager", "editor", "director", "coordinator")
    return {
        "date_directories":      list_date_directories(project),
        "edit_date_directories": list_edit_date_directories(project) if can_see_edit else [],
        "has_edit":              directory_exists(project, "edit") and can_see_edit,
        "has_assets":            directory_exists(project, "assets"),
        "has_shared":            directory_exists(project, "shared"),
        "assets_subdirectories": list_subdirectories(project, "assets"),   # ← new
        "shared_subdirectories": list_subdirectories(project, "shared"),   # ← new
        "user_role":             user_role,
    }


# ─── LIST FILES ──────────────────────────────────────────────────────


@router.get("/projects/{project_id}/files", response=List[FileOut])
def list_files(
    request,
    project_id: int,
    directory_type: str,
    date: Optional[str] = None,
    subdirectory: Optional[str] = None,   # ← new
):
    project = get_accessible_project(request.auth, project_id)
    check_directory_access(request.auth, project_id, directory_type)
    files = FileRecord.objects.filter(
        project=project,
        directory_type=directory_type,
        is_deleted=False,
    ).select_related("uploaded_by")
    if date:
        files = files.filter(date_directory=date_cls.fromisoformat(date))
    files = files.filter(subdirectory=subdirectory or '')   # ← new
    return [serialize_file(f) for f in files.order_by("-uploaded_at")]


# ─── CONFLICT CHECK ──────────────────────────────────────────────────


@router.post("/projects/{project_id}/files/check-conflict", response=ConflictCheckResponse)
def check_file_conflict(request, project_id: int, data: ConflictCheckInput):
    project     = get_accessible_project(request.auth, project_id)
    check_directory_access(request.auth, project_id, data.directory_type)
    stored_name = make_stored_name(data.filename)
    conflict    = check_conflict(
        project, data.directory_type,
        data.date_directory, stored_name,
        data.subdirectory or '',        # ← new
    )
    return {"conflict": conflict}


# ─── UPLOAD ──────────────────────────────────────────────────────────


@router.post("/projects/{project_id}/files/upload", response=FileOut)
def upload_file(
    request,
    project_id: int,
    file: UploadedFile = File(...),
    display_name: str = Form(...),
    directory_type: str = Form(...),
    date_directory: Optional[str] = Form(None),
    overwrite: bool = Form(False),
    mention_user_ids: Optional[str] = Form(None),
    subdirectory: Optional[str] = Form(''),      # ← new
):
    project = get_accessible_project(request.auth, project_id)
    check_directory_access(request.auth, project_id, directory_type)
    if directory_type in ("date", "edit") and not date_directory:
        raise HttpError(400, "date_directory required for date and edit types")
    stored_name = make_stored_name(display_name)
    user_ids = []
    if mention_user_ids:
        try:
            user_ids = [int(i.strip()) for i in mention_user_ids.split(",") if i.strip()]
        except ValueError:
            raise HttpError(400, "mention_user_ids must be comma-separated integers")
    file_record = save_file(
        project=project,
        directory_type=directory_type,
        date_str=date_directory,
        display_name=display_name,
        stored_name=stored_name,
        uploaded_file=file,
        user=request.auth,
        mention_user_ids=user_ids,
        overwrite=overwrite,
        subdirectory=subdirectory or '',  # ← new
    )
    return serialize_file(file_record)


# ─── CREATE DIRECTORY ────────────────────────────────────────────────


@router.post("/projects/{project_id}/directories", response=MessageResponse)
def create_directory(request, project_id: int, data: CreateDirectoryInput):
    """Create a subdirectory inside Assets or Shared. All project members can do this."""
    project = get_accessible_project(request.auth, project_id)
    check_project_member(request.auth, project_id)

    if data.directory_type not in ('assets', 'shared'):
        raise HttpError(400, "Subdirectories can only be created in Assets or Shared")

    try:
        safe_name = validate_directory_name(data.name)
    except ValueError as e:
        raise HttpError(400, str(e))

    from projects.services import get_directory_path
    parent_path  = get_directory_path(project, data.directory_type)
    new_dir_path = os.path.join(parent_path, safe_name)

    if os.path.exists(new_dir_path):
        raise HttpError(409, f"A folder named '{safe_name}' already exists")

    os.makedirs(new_dir_path)
    return {"message": f"Folder '{safe_name}' created"}


# ─── DOWNLOAD ────────────────────────────────────────────────────────


@router.get("/projects/{project_id}/files/{file_id}/download")
def download_file(request, project_id: int, file_id: int):
    project = get_accessible_project(request.auth, project_id)

    try:
        file_record = FileRecord.objects.get(
            id=file_id, project=project, is_deleted=False
        )
    except FileRecord.DoesNotExist:
        raise HttpError(404, "File not found")

    check_directory_access(request.auth, project_id, file_record.directory_type)

    full_path = os.path.join(settings.STORAGE_ROOT, file_record.relative_path)
    if not os.path.exists(full_path):
        raise HttpError(404, "File missing from storage")

    return FileResponse(
        open(full_path, 'rb'),
        as_attachment=True,
        filename=file_record.display_name,
    )


# ─── THUMBNAIL ───────────────────────────────────────────────────────


@router.get("/projects/{project_id}/files/{file_id}/thumbnail")
def get_thumbnail(request, project_id: int, file_id: int):
    project = get_accessible_project(request.auth, project_id)

    try:
        file_record = FileRecord.objects.get(
            id=file_id, project=project, is_deleted=False
        )
    except FileRecord.DoesNotExist:
        raise HttpError(404, "File not found")

    check_directory_access(request.auth, project_id, file_record.directory_type)

    thumb_path = get_thumbnail_path(file_id)
    if not os.path.exists(thumb_path):
        raise HttpError(404, "Thumbnail not available")

    return FileResponse(open(thumb_path, 'rb'), content_type='image/jpeg')


# ─── DELETE ──────────────────────────────────────────────────────────


@router.delete("/projects/{project_id}/files/{file_id}", response=MessageResponse)
def delete_file(request, project_id: int, file_id: int):
    project = get_accessible_project(request.auth, project_id)

    try:
        file_record = FileRecord.objects.get(
            id=file_id, project=project, is_deleted=False
        )
    except FileRecord.DoesNotExist:
        raise HttpError(404, "File not found")

    check_can_delete(request.auth, project_id, file_record.directory_type)

    soft_delete_file(file_record)
    return {"message": f"'{file_record.display_name}' moved to trash"}

