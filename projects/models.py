from django.db import models
from django.conf import settings
import os

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    storage_path = models.CharField(max_length=500, unique=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_projects',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects'

    def __str__(self):
        return self.name

    def get_full_path(self):
        return os.path.join(settings.STORAGE_ROOT, self.storage_path)

class ProjectMembership(models.Model):
    class Role(models.TextChoices):
        DIRECTOR = 'director', 'Director'
        COORDINATOR = 'coordinator', 'Coordinator'
        EDITOR = 'editor', 'Editor'
        USER = 'user', 'User'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_memberships',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_memberships'
        unique_together = (('user', 'project'),)

    def __str__(self):
        return f'{self.user.email} - {self.project.name} ({self.role})'
