from ninja import Router
from ninja.errors import HttpError
from .models import Notification
from .schemas import NotificationOut, UnreadCountOut, MessageResponse

router = Router()


@router.get("/notifications", response=list[NotificationOut])
def list_notifications(request):
    notifications = Notification.objects.filter(
        user=request.auth
    ).select_related(
        "mention",
        "mention__mentioned_by",
    ).order_by("-created_at")[:50]

    return [
        {
            "id": n.id,
            "is_read": n.is_read,
            "created_at": n.created_at,
            "file_id": n.mention.file.id,
            "file_display_name": n.mention.file.display_name,
            "project_id": n.mention.file.project.id,
            "project_name": n.mention.file.project.name,
            "mentioned_by_email": n.mention.mentioned_by.email,
            "mentioned_by_name": n.mention.mentioned_by.full_name,
        }
        for n in notifications
    ]


@router.get("/notifications/count", response=UnreadCountOut)
def unread_count(request):
    count = Notification.objects.filter(
        user=request.auth, is_read=False
    ).count()
    return {"count": count}


@router.patch("/notifications/{notification_id}/read", response=MessageResponse)
def mark_read(request, notification_id: int):
    try:
        n = Notification.objects.get(id=notification_id, user=request.auth)
        n.is_read = True
        n.save()
        return {"message": "Marked as read"}
    except Notification.DoesNotExist:
        raise HttpError(404, "Notification not found")


@router.patch("/notifications/mark-all-read", response=MessageResponse)
def mark_all_read(request):
    updated = Notification.objects.filter(
        user=request.auth, is_read=False
    ).update(is_read=True)
    return {"message": f"{updated} notifications marked as read"}
