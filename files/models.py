from django.db import models
from django.conf import settings

from projects.models import Project


class FileRecord(models.Model):
    class DirectoryType(models.TextChoices):
        DATE = 'date', 'Date Directory'
        EDIT = 'edit', 'Edit Directory'
        ASSETS = 'assets', 'Assets'
        SHARED = 'shared', 'Shared'

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='files'
    )
    display_name = models.CharField(max_length=500)
    stored_name = models.CharField(max_length=500)
    relative_path = models.CharField(max_length=1000)
    directory_type = models.CharField(max_length=20, choices=DirectoryType.choices)
    date_directory = models.DateField(null=True, blank=True)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_files'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'file_records'

    def __str__(self):
        return self.display_name
