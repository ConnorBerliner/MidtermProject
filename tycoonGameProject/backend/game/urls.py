from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .routers import GameRouter
from .views import PlayerViewSet, RegisterView, ResourceNodeViewSet

router = GameRouter()
router.register("nodes", ResourceNodeViewSet, basename="node")
router.register("player", PlayerViewSet, basename="player")

urlpatterns = [
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("", include(router.urls)),
]