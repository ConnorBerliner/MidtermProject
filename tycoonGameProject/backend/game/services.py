import math
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .exceptions import InsufficientFunds
from .models import (
    MAX_LEVEL,
    Achievement,
    Player,
    PlayerAchievement,
    PlayerNode,
    PlayerUpgrade,
    ResourceNode,
    Upgrade,
)

OFFLINE_CAP_SECONDS = 8 * 3600
MIN_DISCOUNT_MULTIPLIER = 0.1  


@dataclass(frozen=True)
class Effects:
    """Multipliers produced by the player's upgrades (1.0 = no effect)."""

    income: float = 1.0
    speed: float = 1.0
    discount: float = 1.0 


def player_effects(player: Player) -> Effects:
    bonus = {"income": 0.0, "speed": 0.0, "discount": 0.0}
    for owned in player.upgrades.select_related("upgrade"):
        bonus[owned.upgrade.effect] = owned.level * owned.upgrade.per_level
    return Effects(
        income=1 + bonus["income"],
        speed=1 + bonus["speed"],
        discount=max(MIN_DISCOUNT_MULTIPLIER, 1 - bonus["discount"]),
    )


def income_per_second(player: Player, effects: Effects) -> float:
    base = sum(
        pn.level * pn.node.base_income
        for pn in player.nodes.select_related("node").filter(node__cycle_seconds=0)
    )
    return base * effects.income


def cycle_length(node: ResourceNode, effects: Effects) -> float:
    """Seconds for one full round trip after the speed upgrade."""
    return node.cycle_seconds / effects.speed


def cycle_payout(node: ResourceNode, level: int, effects: Effects) -> float:
    return node.base_income * node.cycle_seconds * level * effects.income


def unlock_achievements(player: Player) -> None:
    owned = player.achievements.values_list("id", flat=True)
    newly = Achievement.objects.filter(threshold__lte=player.total_earned).exclude(id__in=owned)
    PlayerAchievement.objects.bulk_create(
        [PlayerAchievement(player=player, achievement=a) for a in newly]
    )


def settle_cycles(player: Player, now, effects: Effects) -> float:
    earned = 0.0
    owned = player.nodes.select_related("node").filter(node__cycle_seconds__gt=0, level__gt=0)
    for pn in owned:
        length = cycle_length(pn.node, effects)
        if pn.cycle_started_at is None:
            pn.cycle_started_at = now
            pn.save(update_fields=["cycle_started_at"])
            continue
        elapsed = min(max(0.0, (now - pn.cycle_started_at).total_seconds()), OFFLINE_CAP_SECONDS)
        done = int(elapsed // length)
        if done:
            earned += done * cycle_payout(pn.node, pn.level, effects)
            pn.cycle_started_at = now - timedelta(seconds=elapsed % length)
            pn.save(update_fields=["cycle_started_at"])
    return earned


def apply_accrual(player: Player, now=None) -> float:
    now = now or timezone.now()
    effects = player_effects(player)
    elapsed = min(max(0.0, (now - player.last_synced).total_seconds()), OFFLINE_CAP_SECONDS)
    earned = income_per_second(player, effects) * elapsed + settle_cycles(player, now, effects)
    player.currency += earned
    player.total_earned += earned
    player.last_synced = now
    player.save(update_fields=["currency", "total_earned", "last_synced"])
    unlock_achievements(player)
    return earned


def node_cost(node: ResourceNode, level: int, qty: int = 1, discount: float = 1.0) -> int:
    r = node.cost_growth
    return math.ceil(node.base_cost * (r**level) * (r**qty - 1) / (r - 1) * discount)


def upgrade_cost(upgrade: Upgrade, level: int) -> int:
    return math.ceil(upgrade.base_cost * upgrade.cost_growth**level)


def _locked_player(user) -> Player:
    player, _ = Player.objects.select_for_update().get_or_create(user=user)
    return player


@transaction.atomic
def sync_player(user) -> tuple[Player, float]:
    player = _locked_player(user)
    return player, apply_accrual(player)


@transaction.atomic
def buy_node(user, slug: str, qty: int) -> tuple[Player, float]:
    player = _locked_player(user)
    earned = apply_accrual(player)
    effects = player_effects(player)
    node = get_object_or_404(ResourceNode, slug=slug)  
    owned, _ = PlayerNode.objects.get_or_create(player=player, node=node)

    if owned.level + qty > MAX_LEVEL:
        raise ValidationError({"qty": f"Maximum level is {MAX_LEVEL}."})

    cost = node_cost(node, owned.level, qty, effects.discount)
    if player.currency < cost:
        raise InsufficientFunds()  

    player.currency -= cost
    player.save(update_fields=["currency"])
    if node.cycle_seconds > 0 and owned.level == 0:
        owned.cycle_started_at = timezone.now()
    owned.level += qty
    owned.save(update_fields=["level", "cycle_started_at"])
    return player, earned


def _rescale_cycles(player: Player, old_speed: float, new_speed: float) -> None:
    """Keep each ship at the same fraction of its current trip when the speed changes."""
    now = timezone.now()
    ratio = old_speed / new_speed 
    trips = player.nodes.filter(
        node__cycle_seconds__gt=0, level__gt=0, cycle_started_at__isnull=False
    )
    for pn in trips:
        phase = (now - pn.cycle_started_at).total_seconds()
        pn.cycle_started_at = now - timedelta(seconds=phase * ratio)
        pn.save(update_fields=["cycle_started_at"])


@transaction.atomic
def buy_upgrade(user, slug: str) -> tuple[Player, float]:
    player = _locked_player(user)
    earned = apply_accrual(player) 
    upgrade = get_object_or_404(Upgrade, slug=slug)
    owned, _ = PlayerUpgrade.objects.get_or_create(player=player, upgrade=upgrade)

    if owned.level >= upgrade.max_level:
        raise ValidationError({"upgrade": "This upgrade is already at its maximum level."})

    cost = upgrade_cost(upgrade, owned.level)
    if player.currency < cost:
        raise InsufficientFunds()

    old = player_effects(player)
    player.currency -= cost
    player.save(update_fields=["currency"])
    owned.level += 1
    owned.save(update_fields=["level"])

    if upgrade.effect == Upgrade.Effect.SPEED:
        _rescale_cycles(player, old.speed, player_effects(player).speed)
    return player, earned