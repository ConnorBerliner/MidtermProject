from django.contrib import admin

from .models import Achievement, Player, PlayerNode, PlayerUpgrade, ResourceNode, Upgrade

admin.site.register([Achievement, Player, PlayerNode, PlayerUpgrade, ResourceNode, Upgrade])