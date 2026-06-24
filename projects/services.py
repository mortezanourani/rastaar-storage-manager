import os
import re
from django.conf import settings


def slugify_name(name: str) -> str:
    """Convert project name to a safe directory name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'\s+', '_', slug)
    return slug.strip('_') or 'project'


def create_project_directory(project) -> None:
    """Create the main project directory on storage."""
    os.makedirs(project.get_full_path(), exist_ok=True)


def create_coordinator_directories(project) -> None:
    """
    Create Edit, Assets, Shared directories.
    Called when a coordinator is assigned to a project.
    """
    base = project.get_full_path()
    for dirname in ["Edit", "Assets", "Shared"]:
        os.makedirs(os.path.join(base, dirname), exist_ok=True)


def ensure_date_directory(project, directory_type: str, date_str: str) -> str:
    """Ensures a date subdirectory exists and returns its full path."""
    base = project.get_full_path()

    if directory_type == "date":
        path = os.path.join(base, date_str)
    elif directory_type == "edit":
        path = os.path.join(base, "Edit", date_str)
    else:
        raise ValueError(f"Date directories not applicable for: {directory_type}")

    os.makedirs(path, exist_ok=True)
    return path


def get_directory_path(project, directory_type: str, date_str: str = None) -> str:
    """Returns the full filesystem path for a given directory type."""
    base = project.get_full_path()

    if directory_type == "date":
        return os.path.join(base, date_str) if date_str else base
    elif directory_type == "edit":
        edit_base = os.path.join(base, "Edit")
        return os.path.join(edit_base, date_str) if date_str else edit_base
    elif directory_type == "assets":
        return os.path.join(base, "Assets")
    elif directory_type == "shared":
        return os.path.join(base, "Shared")
    else:
        raise ValueError(f"Unknown directory type: {directory_type}")


def list_date_directories(project) -> list:
    """Returns sorted (newest first) date directory names in the project root."""
    base = project.get_full_path()
    if not os.path.exists(base):
        return []
    return sorted([
        name for name in os.listdir(base)
        if os.path.isdir(os.path.join(base, name))
        and re.match(r'^\d{4}-\d{2}-\d{2}$', name)
    ], reverse=True)


def list_edit_date_directories(project) -> list:
    """Returns sorted date directory names inside the Edit directory."""
    edit_path = os.path.join(project.get_full_path(), "Edit")
    if not os.path.exists(edit_path):
        return []
    return sorted([
        name for name in os.listdir(edit_path)
        if os.path.isdir(os.path.join(edit_path, name))
        and re.match(r'^\d{4}-\d{2}-\d{2}$', name)
    ], reverse=True)


def directory_exists(project, directory_type: str) -> bool:
    """Check if a special directory (edit/assets/shared) exists on disk."""
    dir_map = {"edit": "Edit", "assets": "Assets", "shared": "Shared"}
    dirname = dir_map.get(directory_type)
    if not dirname:
        return False
    return os.path.isdir(os.path.join(project.get_full_path(), dirname))