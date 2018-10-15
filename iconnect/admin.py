from django.contrib import admin
from iconnect.models import Category, Conversation, Profile

# Register your models here.
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = { "slug": ("title",) }

admin.site.register(Category, CategoryAdmin)
admin.site.register(Conversation)
admin.site.register(Profile)
