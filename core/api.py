from ninja import NinjaAPI
from users.auth import JWTAuth

api = NinjaAPI(
    title="Storage Manager API",
    version="1.0.0",
    docs_url="/docs",
    auth=JWTAuth(),
)

from users.api         import router as users_router
from projects.api      import router as projects_router
from files.api         import router as files_router
from files.global_api  import router as global_router        # ← new
from notifications.api import router as notifications_router

api.add_router("/", users_router,         tags=["Auth & Users"])
api.add_router("/", projects_router,      tags=["Projects"])
api.add_router("/", files_router,         tags=["Files"])
api.add_router("/", global_router,        tags=["Global Storage"])   # ← new
api.add_router("/", notifications_router, tags=["Notifications"])