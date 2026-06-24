from ninja import NinjaAPI
from users.auth import JWTAuth

api = NinjaAPI(
    title='Storage Manager API',
    version='1.0.0',
    docs_url='/docs',
    auth=JWTAuth(),
)

from users.api import router as users_router
api.add_router('/', users_router, tags=['Auth & Users'])
