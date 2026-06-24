from ninja import Schema
from datetime import datetime


class NotificationOut(Schema):
    id: int
    is_read: bool
    created_at: datetime
    file_id: int
    file_display_name: str
    project_id: int
    project_name: str
    mentioned_by_email: str
    mentioned_by_name: str


class UnreadCountOut(Schema):
    count: int


class MessageResponse(Schema):
    message: str
    