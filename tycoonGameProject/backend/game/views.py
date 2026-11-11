import logging

from django.db import DatabaseError
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import ResourceNode
from .permissions import IsAdminOrReadOnly
from .serializers import BuySerializer, RegisterSerializer, ResourceNodeSerializer, BuyUpgradeSerializer, build_state
from .services import buy_node, sync_player, buy_upgrade

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ResourceNodeViewSet(viewsets.ModelViewSet):
    queryset = ResourceNode.objects.all()
    serializer_class = ResourceNodeSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"


class PlayerViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def state(self, request):
        player, earned = sync_player(request.user)
        return Response(build_state(player, earned))

    @action(detail=False, methods=["post"])
    def buy(self, request):
        body = BuySerializer(data=request.data)
        body.is_valid(raise_exception=True)  
        try:
            player, earned = buy_node(
                request.user, body.validated_data["node"], body.validated_data["qty"]
            )
        except DatabaseError:
            logger.exception("Database error during purchase")
            raise APIException("Purchase could not be completed. Please retry.")  
        return Response(build_state(player, earned))

    @action(detail=False, methods=["post"])
    def upgrade(self, request):
        body = BuyUpgradeSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        player, earned = buy_upgrade(request.user, body.validated_data["upgrade"])
        return Response(build_state(player, earned))