from ninja import Schema
from typing import Optional, List
from datetime import datetime, date


class ConflictCheckInput(Schema):
    directory_type: str            # date | edit | assets | shared
    date_directory: Optional[str] = None  # YYYY-MM-DD, required for date/edit
    filename: str


class ConflictCheckResponse(Schema):
    conflict: bool


class FileOut(Schema):
    id: int
    display_name: str
    stored_name: str
    file_size: int
    mime_type: str
    directory_type: str
    date_directory: Optional[date] = None
    uploaded_by_email: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    uploaded_at: datetime
    has_thumbnail: bool


class ProjectStructureOut(Schema):
    date_directories: List[str]
    edit_date_directories: List[str]
    has_edit: bool
    has_assets: bool
    has_shared: bool
    user_role: str


class MessageResponse(Schema):
    message: str