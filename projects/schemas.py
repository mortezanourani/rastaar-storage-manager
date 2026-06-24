from ninja import Schema
from typing import Optional, List
from datetime import datetime


class ProjectCreate(Schema):
    name: str
    description: str = ""


class ProjectUpdate(Schema):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProjectOut(Schema):
    id: int
    name: str
    description: str
    storage_path: str
    is_active: bool
    created_at: datetime


class MemberAdd(Schema):
    user_id: int
    role: str  # director | coordinator | editor | user


class MemberOut(Schema):
    user_id: int
    email: str
    full_name: str
    role: str
    assigned_at: datetime


class MessageResponse(Schema):
    message: str