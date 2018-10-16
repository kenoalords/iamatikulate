from __future__ import absolute_import, unicode_literals
from celery import shared_task

from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.auth.models import User
from iconnect.models import Conversation, Like, Comment

@shared_task
def send_like_notification(post_id, user_id):
    conversation = Conversation.objects.get(id=post_id)
    user = User.objects.get(id=user_id)
    body = render_to_string(template_name='email/parts/send_like_notification.html', context={
        'liker': user,
        'convo': conversation
    })
    email = EmailMultiAlternatives(to=[conversation.user.email], subject='%s %s Supports Your Post on iamatikulate.com' % (user.first_name, user.last_name), body=strip_tags(body) )
    email.attach_alternative(body, 'text/html')
    email.send()

@shared_task
def send_comment_notification(post_id, user_id):
    conversation = Conversation.objects.get(id=post_id)
    user = User.objects.get(id=user_id)
    body = render_to_string(template_name='email/parts/send_comment_notification.html', context={
        'liker': user,
        'convo': conversation
    })
    email = EmailMultiAlternatives(to=[conversation.user.email], subject='%s %s Responded on your Post on iamatikulate.com' % (user.first_name, user.last_name), body=strip_tags(body) )
    email.attach_alternative(body, 'text/html')
    email.send()
