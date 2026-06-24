from django.db import models
from django.conf import settings

class Mention(models.Model):
    file = models.ForeignKey(
        'files.FileRecord',
        on_delete=models.CASCADE,
        related_name='mentions',
    )
    mentioned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentions_received',
    )
    mentioned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mentions_sent',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mentions'

class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    mention = models.ForeignKey(
        Mention,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
