from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from game.models import Achievement, Player, ResourceNode, Upgrade

NODES = [
    ("space-port", "Space Port", 10, 1.15, 0.2, 0),
    ("satellite", "Satellite", 100, 1.15, 1.5, 0),
    ("cargo-ship", "Cargo Ship", 1100, 1.14, 10, 30),
    ("space-station", "Space Station", 12000, 1.13, 75, 0),
    ("dyson-sphere", "Dyson Sphere", 130000, 1.12, 600, 0),
]
ACHIEVEMENTS = [
    ("first-steps", "First Steps", "Earn 100 total.", 100),
    ("interplanetary", "Interplanetary", "Earn 10,000 total.", 10000),
    ("space-emperor", "Space Emperor", "Earn 1,000,000 total.", 1000000),
]

UPGRADES = [
    ("market-boost", "Market Boost", "+10% income per level.", "income", 0.10, 250, 1.8, 10),
    ("turbo-engines", "Turbo Engines", "Cargo ships sail 10% faster per level.", "speed", 0.10, 2_000, 2.0, 10),
    ("bulk-contracts", "Bulk Contracts", "5% off purchases per level.", "discount", 0.05, 1_000, 2.0, 10),
]

class Command(BaseCommand):
    help = "Seed resource nodes and achievements"

    def handle(self, *args, **opts):
        for i, (slug, name, cost, growth, income, cycle) in enumerate(NODES):
            ResourceNode.objects.update_or_create(
                slug=slug,
                defaults=dict(name=name, base_cost=cost, cost_growth=growth, base_income=income, cycle_seconds=cycle, unlock_order=i),
            )
        for slug, name, desc, threshold in ACHIEVEMENTS:
            Achievement.objects.update_or_create(
                slug=slug, defaults=dict(name=name, description=desc, threshold=threshold)
            )
        for slug, name, desc, effect, per_level, cost, growth, max_level in UPGRADES:
            Upgrade.objects.update_or_create(
                slug=slug,
                defaults=dict(name=name, description=desc, effect=effect, per_level=per_level,
                              base_cost=cost, cost_growth=growth, max_level=max_level),
            )

        User = get_user_model()
        user, created = User.objects.get_or_create(username="test")
        if created:
            user.set_password("demo-pass-123")
            user.save()
        Player.objects.get_or_create(user=user)
        self.stdout.write("Test user: test, demo-pass-123")
        self.stdout.write("Seeded.")