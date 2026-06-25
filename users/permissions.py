from ninja.errors import HttpError
from projects.models import ProjectMembership

# Roles that can access the Edit directory
EDIT_DIRECTORY_ROLES = ["editor", "director", "coordinator"]


def check_admin(user):
    if not user.is_administrator:
        raise HttpError(403, "Administrator access required")


def check_manager_or_admin(user):
    if not user.is_global_manager:
        raise HttpError(403, "Manager or Administrator access required")


def get_project_role(user, project_id):
    """
    Returns the user's effective role in a project.
    - Global managers/admins always return 'manager'
    - Returns None if user has no membership
    """
    if user.is_global_manager:
        return "manager"
    try:
        membership = ProjectMembership.objects.get(
            user=user,
            project_id=project_id
        )
        return membership.role
    except ProjectMembership.DoesNotExist:
        return None


def check_project_member(user, project_id):
    """Raises 403 if user has no access to the project."""
    role = get_project_role(user, project_id)
    if role is None:
        raise HttpError(403, "You don't have access to this project")
    return role


def check_directory_access(user, project_id, directory_type):
    """
    Validates access to a specific directory type.
    Edit directory is restricted to certain roles.
    """
    role = check_project_member(user, project_id)  # raises 403 if not member

    if role == "manager":
        return True  # full access

    if directory_type == "edit" and role not in EDIT_DIRECTORY_ROLES:
        raise HttpError(
            403,
            "Only Editors, Directors, and Coordinators can access the Edit directory"
        )

    return True


def check_can_delete(user, project_id, directory_type=None):
    """Only Managers and Administrators can delete files."""
    if user.is_global_manager:
        return True
    if directory_type == "shared":
        check_project_member(user, project_id)
        return True
    raise HttpError(403, "Only Managers and Administrators can delete files")
