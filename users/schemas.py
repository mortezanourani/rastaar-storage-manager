from ninja import Schema
from typing import Optional
from datetime import datetime


class LoginInput(Schema):
    username: str
    password: str


class TokenResponse(Schema):
    access: str
    refresh: str
    user_id: int
    email: str
    full_name: str
    is_administrator: bool
    is_manager: bool


class RefreshInput(Schema):
    refresh: str


class AccessTokenResponse(Schema):
    access: str


class MessageResponse(Schema):
    message: str


class UserOut(Schema):
    id: int
    email: str
    username: str
    full_name: str
    is_administrator: bool
    is_manager: bool
    is_active: bool
    created_at: datetime


class UserCreate(Schema):
    email: str
    username: str
    full_name: str
    password: str
    is_administrator: bool = False
    is_manager: bool = False


class UserUpdate(Schema):
    full_name: Optional[str] = None
    is_administrator: Optional[bool] = None
    is_manager: Optional[bool] = None
    is_active: Optional[bool] = None