# Generated by Django 2.0.2 on 2018-10-11 15:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iconnect', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='conversation',
            name='latitude',
            field=models.DecimalField(decimal_places=10, max_digits=15, null=True),
        ),
        migrations.AlterField(
            model_name='conversation',
            name='longitude',
            field=models.DecimalField(decimal_places=10, max_digits=15, null=True),
        ),
    ]
