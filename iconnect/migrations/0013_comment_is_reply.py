# Generated by Django 2.0.2 on 2018-11-05 10:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iconnect', '0012_commentlike'),
    ]

    operations = [
        migrations.AddField(
            model_name='comment',
            name='is_reply',
            field=models.BooleanField(default=False),
        ),
    ]