from __future__ import absolute_import, unicode_literals
from celery import shared_task
import json
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.auth.models import User
from iconnect.models import Conversation, Like, Comment, Subscription, CommentLike
from pywebpush import webpush, WebPushException
from django.conf import settings
from django.shortcuts import reverse

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

@shared_task
def send_like_push_notification(convo_user_id, uuid, fullname):
    user_sub = Subscription.objects.filter(user=convo_user_id, is_invalid=False)
    if user_sub:
        for sub in user_sub:
            try:
                sub_endpoint = json.loads(sub.subscription)
                link = reverse('iconnect:view', kwargs={'uuid':uuid})
                data = json.dumps({
                    'body': fullname + ' Liked your post on #iamatikulate.com',
                    'link': settings.BASE_URL + link
                })
                webpush(sub_endpoint, data, vapid_private_key=settings.VAPID_PRIVATE_KEY, vapid_claims={"sub": "mailto:we@iamatikulate.com",})
            except WebPushException as ex:
                sub.is_invalid = True
                sub.save()
    else:
        return False

@shared_task
def send_post_push_notification(uuid, fullname):
    user_sub = Subscription.objects.filter(is_invalid=False)
    if user_sub:
        for sub in user_sub:
            try:
                sub_endpoint = json.loads(sub.subscription)
                link = reverse('iconnect:view', kwargs={'uuid':uuid})
                data = json.dumps({
                    'body': fullname + ' posted on #iamatikulate.com',
                    'link': settings.BASE_URL + link
                })
                webpush(sub_endpoint, data, vapid_private_key=settings.VAPID_PRIVATE_KEY, vapid_claims={"sub": "mailto:we@iamatikulate.com",})
            except WebPushException as ex:
                sub.is_invalid = True
                sub.save()
    else:
        return False

@shared_task
def send_comment_push_notification(convo_user_id, uuid, fullname):
    user_sub = Subscription.objects.filter(user=convo_user_id, is_invalid=False)
    if user_sub:
        for sub in user_sub:
            try:
                sub_endpoint = json.loads(sub.subscription)
                link = reverse('iconnect:view', kwargs={'uuid':uuid})
                data = json.dumps({
                    'body': fullname + ' responded to your post on #iamatikulate.com',
                    'link': settings.BASE_URL + link
                })
                webpush(sub_endpoint, data, vapid_private_key=settings.VAPID_PRIVATE_KEY, vapid_claims={"sub": "mailto:we@iamatikulate.com",})
            except WebPushException as ex:
                sub.is_invalid = True
                sub.save()
    else:
        return False

@shared_task
def send_comment_like_push_notification(convo_user_id, fullname, uuid):
    user_sub = Subscription.objects.filter(user=convo_user_id, is_invalid=False)
    if user_sub:
        for sub in user_sub:
            try:
                sub_endpoint = json.loads(sub.subscription)
                link = reverse('iconnect:view', kwargs={'uuid':uuid})
                data = json.dumps({
                    'body': fullname + ' Likes your comment on #iamatikulate.com',
                    'link': settings.BASE_URL + link
                })
                webpush(sub_endpoint, data, vapid_private_key=settings.VAPID_PRIVATE_KEY, vapid_claims={"sub": "mailto:we@iamatikulate.com",})
            except WebPushException as ex:
                print(ex)
                # sub.is_invalid = True
                # sub.save()
    else:
        return False