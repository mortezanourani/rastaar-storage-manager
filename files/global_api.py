from ninja import Router, File, Form
from ninja.files import UploadedFile
from ninja.errors import HttpError
from typing import Optional, List
from django.http import FileResponse
from django.conf import settings
import os

from files.models import GlobalFileRecord
from files.schemas import (
    GlobalFileOut, GlobalStructureOut, GlobalConflictCheckInput,
    CreateGlobalDirectoryInput, MessageResponse,
)
from files.services import (
    make_stored_name,
    check_global_conflict, save_global_file, soft_delete_global_file,
    serialize_global_file, ensure_global_root, list_global_subdirectories,
    get_global_thumbnail_path, has_global_thumbnail, get_global_dir_path,
)
from projects.services import validate_directory_name

router = Router()


@router.get("/global/structure", response=GlobalStructureOut)
def get_global_structure(request):
    ensure_global_root()
    return {"subdirectories": list_global_subdirectories()}


@router.get("/global/files", response=List[GlobalFileOut])
def list_global_files(request, subdirectory: str = ''):
    files = GlobalFileRecord.objects.filter(
        subdirectory=subdirectory,
        is_deleted=False,
    ).select_related("uploaded_by").order_by("-uploaded_at")
    return [serialize_global_file(f) for f in files]


@router.post("/global/files/check-conflict", response=dict)
def check_global_file_conflict(request, data: GlobalConflictCheckInput):
    stored_name = make_stored_name(data.filename)
    conflict    = check_global_conflict(stored_name, data.subdirectory or '')
    return {"conflict": conflict}


@router.post("/global/files/upload", response=GlobalFileOut)
def upload_global_file(
    request,
    file: UploadedFile = File(...),
    display_name: str = Form(...),
    subdirectory: str = Form(''),
    overwrite: bool = Form(False),
):
    ensure_global_root()
    stored_name = make_stored_name(display_name)
    file_record = save_global_file(
        display_name  = display_name,
        stored_name   = stored_name,
        subdirectory  = subdirectory,
        uploaded_file = file,
        user          = request.auth,
        overwrite     = overwrite,
    )
    return serialize_global_file(file_record)


@router.get("/global/files/{file_id}/download")
def download_global_file(request, file_id: int):
    try:
        f = GlobalFileRecord.objects.get(id=file_id, is_deleted=False)
    except GlobalFileRecord.DoesNotExist:
        raise HttpError(404, "File not found")
    full_path = os.path.join(settings.STORAGE_ROOT, f.relative_path)
    if not os.path.exists(full_path):
        raise HttpError(404, "File missing from storage")
    return FileResponse(open(full_path, 'rb'), as_attachment=True, filename=f.display_name)


@router.get("/global/files/{file_id}/thumbnail")
def get_global_thumbnail(request, file_id: int):
    try:
        GlobalFileRecord.objects.get(id=file_id, is_deleted=False)
    except GlobalFileRecord.DoesNotExist:
        raise HttpError(404, "File not found")
    thumb_path = get_global_thumbnail_path(file_id)
    if not os.path.exists(thumb_path):
        raise HttpError(404, "Thumbnail not available")
    return FileResponse(open(thumb_path, 'rb'), content_type='image/jpeg')


@router.delete("/global/files/{file_id}", response=MessageResponse)
def delete_global_file(request, file_id: int):
    try:
        f = GlobalFileRecord.objects.get(id=file_id, is_deleted=False)
    except GlobalFileRecord.DoesNotExist:
        raise HttpError(404, "File not found")
    is_uploader = f.uploaded_by_id == request.auth.id
    if not (is_uploader or request.auth.is_global_manager):
        raise HttpError(403, "You can only delete your own files")
    soft_delete_global_file(f)
    return {"message": f"'{f.display_name}' moved to trash"}


@router.post("/global/directories", response=MessageResponse)
def create_global_directory(request, data: CreateGlobalDirectoryInput):
    try:
        safe_name = validate_directory_name(data.name)
    except ValueError as e:
        raise HttpError(400, str(e))
    new_path = os.path.join(ensure_global_root(), safe_name)
    if os.path.exists(new_path):
        raise HttpError(409, f"Folder '{safe_name}' already exists")
    os.makedirs(new_path)
    return {"message": f"Folder '{safe_name}' created"}
