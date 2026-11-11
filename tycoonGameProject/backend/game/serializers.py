from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Achievement, Player, ResourceNode, Upgrade
from .services import player_effects, upgrade_cost

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "password"]

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        Player.objects.get_or_create(user=user)
        return user


class ResourceNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceNode
        fields = [
            "slug", "name", "base_cost", "cost_growth",
            "base_income", "cycle_seconds", "unlock_order",
        ]


class NodeStateSerializer(serializers.ModelSerializer):
    level = serializers.SerializerMethodField()
    cycle_elapsed = serializers.SerializerMethodField()

    class Meta:
        model = ResourceNode
        fields = [
            "slug", "name", "base_cost", "cost_growth", "base_income",
            "cycle_seconds", "level", "cycle_elapsed",
        ]

    def get_level(self, obj) -> int:
        return self.context["levels"].get(obj.id, 0)

    def get_cycle_elapsed(self, obj) -> float:
        return self.context["elapsed"].get(obj.id, 0.0)


class UpgradeStateSerializer(serializers.ModelSerializer):
    level = serializers.SerializerMethodField()
    next_cost = serializers.SerializerMethodField()

    class Meta:
        model = Upgrade
        fields = [
            "slug", "name", "description", "effect", "per_level",
            "max_level", "level", "next_cost",
        ]

    def get_level(self, obj) -> int:
        return self.context["upgrade_levels"].get(obj.id, 0)

    def get_next_cost(self, obj) -> int | None:
        level = self.get_level(obj)
        return upgrade_cost(obj, level) if level < obj.max_level else None  # None = maxed


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ["slug", "name", "description"]


class MultipliersSerializer(serializers.Serializer):
    income = serializers.FloatField()
    speed = serializers.FloatField()
    discount = serializers.FloatField()


class PlayerStateSerializer(serializers.Serializer):
    currency = serializers.FloatField()
    offline_earned = serializers.FloatField()
    income_per_second = serializers.FloatField()
    nodes = NodeStateSerializer(many=True)
    achievements = AchievementSerializer(many=True)
    upgrades = UpgradeStateSerializer(many=True)
    multipliers = MultipliersSerializer()


class BuySerializer(serializers.Serializer):
    node = serializers.SlugField()
    qty = serializers.IntegerField(min_value=1, max_value=1000, default=1)


class BuyUpgradeSerializer(serializers.Serializer):
    upgrade = serializers.SlugField()


def build_state(player: Player, offline_earned: float = 0.0):
    effects = player_effects(player)
    nodes = list(ResourceNode.objects.all())
    owned = list(player.nodes.all())
    levels = {pn.node_id: pn.level for pn in owned}
    now = timezone.now()
    elapsed = {
        pn.node_id: max(0.0, (now - pn.cycle_started_at).total_seconds())
        for pn in owned
        if pn.cycle_started_at
    }
    passive = sum(levels.get(n.id, 0) * n.base_income for n in nodes if n.cycle_seconds == 0)
    payload = {
        "currency": player.currency,
        "offline_earned": offline_earned,
        "income_per_second": passive * effects.income,
        "nodes": nodes,
        "achievements": player.achievements.all(),
        "upgrades": Upgrade.objects.all(),
        "multipliers": {
            "income": effects.income,
            "speed": effects.speed,
            "discount": effects.discount,
        },
    }
    context = {
        "levels": levels,
        "elapsed": elapsed,
        "upgrade_levels": dict(player.upgrades.values_list("upgrade_id", "level")),
    }
    return PlayerStateSerializer(payload, context=context).data