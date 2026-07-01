from ninja import Schema
from typing import Optional, List
from datetime import datetime, date


class ConflictCheckInput(Schema):
    directory_type: str
    date_directory: Optional[str] = None
    filename:       str
    subdirectory:   Optional[str] = ''    # ← new


class ConflictCheckResponse(Schema):
    conflict: bool


class FileOut(Schema):
    id:                int
    display_name:      str
    stored_name:       str
    file_size:         int
    mime_type:         str
    directory_type:    str
    date_directory:    Optional[date] = None
    subdirectory:      str = ''           # ← new
    uploaded_by_email: Optional[str] = None
    uploaded_by_name:  Optional[str] = None
    uploaded_at:       datetime
    has_thumbnail:     bool


class ProjectStructureOut(Schema):
    date_directories:      List[str]
    edit_date_directories: List[str]
    has_edit:              bool
    has_assets:            bool
    has_shared:            bool
    assets_subdirectories: List[str]      # ← new
    shared_subdirectories: List[str]      # ← new
    user_role:             str


class CreateDirectoryInput(Schema):
    directory_type: str   # assets | shared
    name:           str


class MessageResponse(Schema):
    message: str


# ── Global Storage ────────────────────────────────────────────────────

class GlobalFileOut(Schema):
    id:                int
    display_name:      str
    stored_name:       str
    file_size:         int
    mime_type:         str
    subdirectory:      str
    uploaded_by_email: Optional[str] = None
    uploaded_by_name:  Optional[str] = None
    uploaded_at:       datetime
    has_thumbnail:     bool


class GlobalStructureOut(Schema):
    subdirectories: List[str]


class GlobalConflictCheckInput(Schema):
    filename:     str
    subdirectory: Optional[str] = ''


class CreateGlobalDirectoryInput(Schema):
    name: str
