from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

MAX_LEVEL = 2000


class Achievement(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    threshold = models.FloatField(validators=[MinValueValidator(0)])  

    def __str__(self):
        return self.name


class ResourceNode(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    base_cost = models.FloatField(validators=[MinValueValidator(1)])
    cost_growth = models.FloatField(default=1.15, validators=[MinValueValidator(1.01)])
    base_income = models.FloatField(validators=[MinValueValidator(0.01)])
    unlock_order = models.PositiveIntegerField(default=0)
    cycle_seconds = models.FloatField(default=0, validators=[MinValueValidator(0)])
                                      
    class Meta:
        ordering = ["unlock_order"]

    def __str__(self):
        return self.name


class Player(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="player"
    )
    currency = models.FloatField(default=10, validators=[MinValueValidator(0)])
    total_earned = models.FloatField(default=0, validators=[MinValueValidator(0)])
    last_synced = models.DateTimeField(default=timezone.now)
    achievements = models.ManyToManyField(
        Achievement, through="PlayerAchievement", blank=True, related_name="players"
    )

    def __str__(self):
        return f"Player({self.user})"


class PlayerNode(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="nodes")
    node = models.ForeignKey(ResourceNode, on_delete=models.CASCADE)
    level = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(MAX_LEVEL)])
    cycle_started_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["player", "node"], name="unique_player_node")
        ]


class PlayerAchievement(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["player", "achievement"], name="unique_player_achievement"
            )
        ]

class Upgrade(models.Model):
    class Effect(models.TextChoices):
        INCOME = "income", "Income boost"
        SPEED = "speed", "Cycle speed"
        DISCOUNT = "discount", "Purchase discount"

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    effect = models.CharField(max_length=10, choices=Effect.choices, unique=True)
    per_level = models.FloatField(validators=[MinValueValidator(0.001)])  # 0.10 = +10% per level
    base_cost = models.FloatField(validators=[MinValueValidator(1)])
    cost_growth = models.FloatField(default=2.0, validators=[MinValueValidator(1.01)])
    max_level = models.PositiveIntegerField(default=10)

    class Meta:
        ordering = ["base_cost"]

    def __str__(self):
        return self.name


class PlayerUpgrade(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="upgrades")
    upgrade = models.ForeignKey(Upgrade, on_delete=models.CASCADE)
    level = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["player", "upgrade"], name="unique_player_upgrade")
        ]

