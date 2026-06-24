from ninja import Router
from ninja.errors import HttpError
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import Project, ProjectMembership
from .schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    MemberAdd, MemberOut, MessageResponse,
)
from .services import (
    slugify_name,
    create_project_directory,
    create_coordinator_directories,
)
from users.permissions import (
    check_admin,
    check_manager_or_admin,
    check_project_member,
)

router = Router()
User = get_user_model()


@router.get("/projects", response=list[ProjectOut])
def list_projects(request):
    user = request.auth
    if user.is_global_manager:
        return Project.objects.filter(is_active=True).order_by("name")
    project_ids = ProjectMembership.objects.filter(
        user=user
    ).values_list("project_id", flat=True)
    return Project.objects.filter(
        id__in=project_ids, is_active=True
    ).order_by("name")


@router.post("/projects", response=ProjectOut)
def create_project(request, data: ProjectCreate):
    check_admin(request.auth)

    storage_path = slugify_name(data.name)
    base = storage_path
    counter = 1
    while Project.objects.filter(storage_path=storage_path).exists():
        storage_path = f"{base}_{counter}"
        counter += 1

    project = Project.objects.create(
        name=data.name,
        description=data.description,
        storage_path=storage_path,
        created_by=request.auth,
    )
    create_project_directory(project)
    return project


@router.get("/projects/{project_id}", response=ProjectOut)
def get_project(request, project_id: int):
    check_project_member(request.auth, project_id)
    return get_object_or_404(Project, id=project_id, is_active=True)


@router.patch("/projects/{project_id}", response=ProjectOut)
def update_project(request, project_id: int, data: ProjectUpdate):
    check_admin(request.auth)
    project = get_object_or_404(Project, id=project_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    project.save()
    return project


@router.get("/projects/{project_id}/members", response=list[MemberOut])
def list_members(request, project_id: int):
    check_project_member(request.auth, project_id)
    memberships = ProjectMembership.objects.filter(
        project_id=project_id
    ).select_related("user").order_by("user__email")
    return [
        {
            "user_id": m.user.id,
            "email": m.user.email,
            "full_name": m.user.full_name,
            "role": m.role,
            "assigned_at": m.assigned_at,
        }
        for m in memberships
    ]


@router.post("/projects/{project_id}/members", response=MemberOut)
def add_member(request, project_id: int, data: MemberAdd):
    check_manager_or_admin(request.auth)

    valid_roles = ["director", "coordinator", "editor", "user"]
    if data.role not in valid_roles:
        raise HttpError(400, f"Invalid role. Must be: {', '.join(valid_roles)}")

    project = get_object_or_404(Project, id=project_id)

    try:
        user = User.objects.get(id=data.user_id)
    except User.DoesNotExist:
        raise HttpError(404, "User not found")

    membership, _ = ProjectMembership.objects.update_or_create(
        user=user,
        project=project,
        defaults={"role": data.role, "assigned_by": request.auth},
    )

    # First coordinator assigned → create special directories
    if data.role == "coordinator":
        create_coordinator_directories(project)

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": membership.role,
        "assigned_at": membership.assigned_at,
    }


@router.delete("/projects/{project_id}/members/{user_id}", response=MessageResponse)
def remove_member(request, project_id: int, user_id: int):
    check_manager_or_admin(request.auth)
    try:
        membership = ProjectMembership.objects.get(
            project_id=project_id, user_id=user_id
        )
        membership.delete()
        return {"message": "Member removed from project"}
    except ProjectMembership.DoesNotExist:
        raise HttpError(404, "Membership not found")
