from ninja import Router
from ninja.errors import HttpError
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .schemas import (
    LoginInput, TokenResponse,
    RefreshInput, AccessTokenResponse,
    UserOut, UserCreate, UserUpdate,
    MessageResponse,
)

router = Router()
User = get_user_model()


# ─── AUTH ─────────────────────────────────────────────────────────────

@router.post("/auth/login", response=TokenResponse, auth=None)
def login(request, data: LoginInput):
    user = authenticate(request, username=data.email, password=data.password)
    if not user:
        raise HttpError(401, "Invalid email or password")
    if not user.is_active:
        raise HttpError(401, "Account is deactivated")

    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_administrator": user.is_administrator,
        "is_manager": user.is_manager,
    }


@router.post("/auth/refresh", response=AccessTokenResponse, auth=None)
def refresh_token(request, data: RefreshInput):
    try:
        refresh = RefreshToken(data.refresh)
        return {"access": str(refresh.access_token)}
    except TokenError:
        raise HttpError(401, "Invalid or expired refresh token")


@router.post("/auth/logout", response=MessageResponse)
def logout(request):
    # JWT is stateless — client discards token
    # Token blacklisting can be added later if needed
    return {"message": "Logged out successfully"}


# ─── USERS ────────────────────────────────────────────────────────────

@router.get("/users/me", response=UserOut)
def get_me(request):
    return request.auth  # request.auth = authenticated User object


@router.get("/users", response=list[UserOut])
def list_users(request):
    if not request.auth.is_administrator:
        raise HttpError(403, "Administrator access required")
    return User.objects.all().order_by("created_at")


@router.post("/users", response=UserOut)
def create_user(request, data: UserCreate):
    if not request.auth.is_administrator:
        raise HttpError(403, "Administrator access required")
    if User.objects.filter(email=data.email).exists():
        raise HttpError(400, "Email already in use")
    if User.objects.filter(username=data.username).exists():
        raise HttpError(400, "Username already in use")

    user = User.objects.create_user(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        password=data.password,
        is_administrator=data.is_administrator,
        is_manager=data.is_manager,
    )
    return user


@router.patch("/users/{user_id}", response=UserOut)
def update_user(request, user_id: int, data: UserUpdate):
    if not request.auth.is_administrator:
        raise HttpError(403, "Administrator access required")
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    user.save()
    return user


@router.delete("/users/{user_id}", response=MessageResponse)
def deactivate_user(request, user_id: int):
    if not request.auth.is_administrator:
        raise HttpError(403, "Administrator access required")
    try:
        user = User.objects.get(id=user_id)
        if user == request.auth:
            raise HttpError(400, "Cannot deactivate your own account")
        user.is_active = False
        user.save()
        return {"message": f"User {user.email} deactivated"}
    except User.DoesNotExist:
        raise HttpError(404, "User not found")