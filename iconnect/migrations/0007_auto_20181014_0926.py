# Generated by Django 2.0.2 on 2018-10-14 09:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iconnect', '0006_auto_20181014_0925'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='age',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
