import pusher
import json
from pywebpush import webpush, WebPushException
from textblob import TextBlob
from django.shortcuts import render, reverse, redirect
from django.db.models import Count, Sum
from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
from django.views.generic import TemplateView, View
from iconnect.forms import ConversationForm, CommentForm, ProfileForm
from iconnect.models import Conversation, Category, Comment, Like, Profile, Subscription
from django.contrib.auth.decorators import login_required, permission_required
from django.utils.decorators import method_decorator
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from iconnect.tasks import send_like_notification, send_comment_notification, send_like_push_notification, send_post_push_notification, send_comment_push_notification
from django.conf import settings
# Create your views here.

pusher_client = pusher.Pusher(
    app_id='624581',
    key='cfeed7cd889c28123bbd',
    secret='beb0e7e8a5ce9f5a48ac',
    cluster='eu',
    ssl=True
)
class IndexView(TemplateView):
    template_name = 'generic/home.html'

    def get_context_data(self, *args, **kwargs):
        context = super().get_context_data(*args, **kwargs)
        context['categories'] = Category.objects.all()
        return context

class HowItWorksView(TemplateView):
    template_name = 'pages/how_it_works.html'

@method_decorator(login_required, name='dispatch')
class PostConversationView(View):
    def get(self, request, *args, **kwargs):
        profile_check = user_profile_check(request)
        try:
            profile = request.user.profile
        except Exception as ex:
            url = reverse('iconnect:profile') + '?status=new'
            return HttpResponseRedirect(url)

        if profile_check:
            return render(request, template_name='generic/post.html', context={ 'form': ConversationForm() })
        else:
            url = reverse('iconnect:profile') + '?status=new'
            return HttpResponseRedirect(url)

    def post(self, request, *args, **kwargs):
        form = ConversationForm(request.POST)
        if form.is_valid():
            text = TextBlob(request.POST['text'])
            convo = form.save(commit=False)
            convo.user = request.user
            if text.sentiment.polarity > 0.3:
                convo.is_public = True
            convo.sentiment_polarity = text.sentiment.polarity
            convo.sentiment_subjectivity = text.sentiment.subjectivity
            convo.save()
            if convo.is_public == True:
                fullname = '%s %s' % (convo.user.first_name, convo.user.last_name)
                send_post_push_notification.delay(convo.uuid, fullname )
            if request.is_ajax():
                return JsonResponse({ 'uuid': convo.uuid, 'redirect_to': reverse('iconnect:view', kwargs={'uuid':convo.uuid}) })
            else:
                return HttpResponseRedirect(reverse('iconnect:view', kwargs={'uuid':convo.uuid}))
        else:
            if request.is_ajax():
                return JsonResponse({ 'status': 'invalid form' })
            else:
                return render(request, template_name='generic/post.html', context={ 'form': ConversationForm(request.POST) })

@method_decorator(login_required, name='dispatch')
class ApprovePendingPost(View):
    def post(self, request, *args, **kwargs):
        if request.user.is_staff:
            try:
                post = Conversation.objects.get(uuid=kwargs['uuid'])
                post.is_public = True
                post.save()
                if post.is_public == True:
                    fullname = '%s %s' % (post.user.first_name, post.user.last_name)
                    send_post_push_notification.delay(post.uuid, fullname )
                return JsonResponse({ 'status': True, 'message': 'Post approved successfully!' })
            except Exception as ex:
                return JsonResponse({ 'status': False, 'message': ex })
        else:
            return JsonResponse({ 'status': False, 'message': 'Unauthorized request' })

@method_decorator(login_required, name='dispatch')
class PendingPostView(TemplateView):
    template_name = 'generic/pending_posts.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['posts'] = Conversation.objects.filter(is_public=False)
        return context
    def get(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return HttpResponseRedirect(reverse('iconnect:dashboard'))
        else:
            return render(request, template_name=self.template_name)

class ViewConversation(TemplateView):
    template_name = 'generic/view.html'
    convo = None

    def get_context_data(self, *args, **kwargs):
        context = super().get_context_data(*args, **kwargs)
        context['comment_form'] = CommentForm()
        self.convo = Conversation.objects.get(uuid=kwargs['uuid'])
        context['comments'] = Comment.objects.filter(conversation=self.convo)
        context['other_posts'] = Conversation.objects.filter(category=self.convo.category, is_public=True).exclude(id=self.convo.id)
        context['post'] = self.convo
        context['category'] = self.convo.category
        return context

    def post(self, request, *args, **kwargs):
        form = CommentForm(request.POST)
        if form.is_valid() and kwargs['uuid'] is not None and request.user.is_authenticated:
            convo = Conversation.objects.get(uuid=kwargs['uuid'])
            comment = form.save(commit=False)
            comment.user = request.user
            comment.conversation = convo
            comment.save()
            count = Comment.objects.filter(conversation=convo).count()
            fullname = '%s %s' % (request.user.first_name, request.user.last_name)
            send_comment_push_notification.delay(convo.user.id, convo.uuid, fullname)
            if request.is_ajax():
                payload = {
                    'text': comment.text,
                    'date': comment.date,
                    'fullname': comment.user.first_name + ' ' + comment.user.last_name
                }
                send_comment_notification.delay(convo.id, request.user.id)
                return JsonResponse({ 'status': True, 'comment': payload, 'count': count })
            else:
                send_comment_notification.delay(convo.id, request.user.id)
                return redirect( reverse('iconnect:view', kwargs={ 'uuid': kwargs['uuid'] }) )
        else:
            if request.is_ajax():
                return JsonResponse({ 'status': False, 'comment': None })
            else:
                return redirect( reverse('iconnect:view', kwargs={ 'uuid': kwargs['uuid'] }) )


class PostLike(View):
    def post(self, request):
        if request.user.is_authenticated:
            uuid = request.POST.get('uuid')
            try:
                conversation = Conversation.objects.get(uuid__exact=uuid)
                like = Like.objects.filter(user=request.user, conversation=conversation)
                if like:
                    return JsonResponse({ 'status': False, 'message': 'You already support this expectation/idea.' })
                else:
                    add_like = Like.objects.create(user=request.user, conversation=conversation, ip=request.META['REMOTE_ADDR'])
                    count = Like.objects.filter(conversation=conversation)
                    fullname = '%s %s' % (request.user.first_name, request.user.last_name)
                    send_like_push_notification.delay(conversation.user.id, conversation.uuid, fullname)
                    send_like_notification.delay(conversation.id, request.user.id)
                    if request.is_ajax():
                        return JsonResponse({ 'status': True, 'message': 'You support for this expectation/idea has been acknowledged.', 'count': count.count() })
                    else:
                        return HttpResponseRedirect(reverse('iconnect:view', kwargs={ 'uuid': conversation.uuid }))
            except Exception as ex:
                if request.is_ajax():
                    return JsonResponse({ 'status': False, 'message': ex })
                else:
                    return HttpResponseRedirect(reverse('iconnect:view', kwargs={ 'uuid': conversation.uuid }))
        else:
            if request.is_ajax():
                return JsonResponse({ 'status': False, 'message': 'Please login or signup to support this post.' })
            else:
                message.error(request, 'Please login or signup to support this post.')
                return HttpResponseRedirect(reverse('iconnect:view', kwargs={ 'uuid': conversation.uuid }))


class ExploreView(TemplateView):
    template_name = 'generic/explore.html'
    categories = Category.objects.all()
    locations = Conversation.objects.values('state').annotate(num_post=Count('state')).order_by('-num_post')
    category = None
    cat_id = None
    state = None


    def get(self, request, *args, **kwargs):
        posts = Conversation.objects.filter(is_public=True, is_deleted=False)
        try:
            self.category = request.GET['category']
            self.cat_id = request.GET['id']
        except Exception as ex:
            print(ex)

        try:
            self.state = request.GET['state']
        except Exception as ex:
            print(ex)
        if self.category and self.cat_id:
            posts = posts.filter(category__id__exact=self.cat_id)

        if self.state:
            posts = posts.filter(state__exact=self.state)

        return render(request, template_name=self.template_name, context={ 'categories': self.categories, 'posts': posts, 'locations': self.locations })

@method_decorator(login_required, name='dispatch')
class DashboardView(TemplateView):
    def get(self, request, *args, **kwargs):
        profile_check = user_profile_check(request)
        print(profile_check)
        if profile_check == False:
            return HttpResponseRedirect(reverse('iconnect:profile'))
        else:
            posts = Conversation.objects.filter(user=request.user)
            return render(request, template_name = 'generic/dashboard.html', context={'posts':posts})

def user_profile_check(request):
    if request.user.is_authenticated:
        if request.user.first_name and request.user.last_name:
            return True
        else:
            return False
    else:
        return False

class ProfileView(TemplateView):
    template_name = 'generic/profile.html'
    initial = {}
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            profile = Profile.objects.get(user=self.request.user)
            self.initial = {
                'first_name': self.request.user.first_name,
                'last_name': self.request.user.last_name,
                'age': profile.age,
                'gender': profile.gender,
            }
        except Exception as ex:
            self.initial = {
                'first_name': self.request.user.first_name,
                'last_name': self.request.user.last_name,
            }

        context['form'] = ProfileForm(initial=self.initial)
        return context

    def post(self, request, *args, **kwargs):
        form = ProfileForm(request.POST, request.FILES)
        if form.is_valid():
            user = request.user
            user.first_name = form.cleaned_data['first_name']
            user.last_name = form.cleaned_data['last_name']
            user.save()
            try:
                profile = Profile.objects.get(user=user)
                profile.age = form.cleaned_data['age']
                if form.cleaned_data['avatar']:
                    profile.avatar = form.cleaned_data['avatar']
                profile.gender = form.cleaned_data['gender']
                profile.save()
                messages.success(request, 'Profile details updated successfully.')
            except ObjectDoesNotExist as ex:
                new_profile = Profile.objects.create(user=user, age=form.cleaned_data['age'], gender=form.cleaned_data['gender'])
                new_profile.save()
                messages.success(request, 'Profile details updated successfully.')
            except Exception as ex:
                messages.error(request, 'There was a problem updating your profile.')

            return HttpResponseRedirect(reverse('iconnect:profile'))
        else:
            re_form = ProfileForm(request.POST, request.FILES)
            return render(request, template_name = 'generic/profile.html', context={'form': re_form})

class DashboardLikesView(TemplateView):
    template_name = 'generic/dashboard_likes.html'
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['likes'] = Conversation.active.filter(like__user=self.request.user).order_by('like__date')
        return context

class PushNotificationSubscription(View):
    def post(self, request):
        if request.user.is_authenticated:
            subscription = Subscription.objects.create(subscription=request.POST['endpoint'])
            subscription.user = request.user
            subscription.save()
            return JsonResponse({'status': True})
        else:
            subscription = Subscription.objects.create(subscription=request.POST['endpoint'])
            subscription.save()
            return JsonResponse({'status': True})
        return JsonResponse({'status': False})
