from django.db import models
from django.shortcuts import reverse
from django.contrib.auth.models import User
from iconnect.managers import ConversationManager
import uuid

# Create your models here.
class Category(models.Model):
    title = models.CharField(max_length=64)
    slug = models.CharField(max_length=64)
    icon = models.CharField(max_length=24)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['title',]


class Conversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    uuid = models.UUIDField(default=uuid.uuid4)
    text = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    country = models.CharField(max_length=64, blank=True, null=True)
    state = models.CharField(max_length=64, blank=True, null=True)
    city = models.CharField(max_length=64, blank=True, null=True)
    latitude = models.DecimalField(max_digits=15, decimal_places=10, null=True)
    longitude = models.DecimalField(max_digits=15, decimal_places=10, null=True)
    date = models.DateTimeField(auto_now=True)
    sentiment_polarity = models.DecimalField(max_digits=3, decimal_places=1, null=True)
    sentiment_subjectivity = models.DecimalField(max_digits=3, decimal_places=1, null=True)
    is_public = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    objects = models.Manager()
    active = ConversationManager()

    def __str__(self):
        return self.user.first_name + ' ' + self.state

    def fullname(self):
        return '%s %s' %(self.user.first_name, self.user.last_name)

    def location(self):
        return '%s %s, %s.' %(self.city, self.state, self.country)

    def likes(self):
        return Like.objects.filter(conversation=self.id).count()

    def comments(self):
        return Comment.objects.filter(conversation=self.id).count()

    def link(self):
        return reverse('iconnect:view', kwargs={'uuid': self.uuid})

    class Meta:
        ordering = ['-date',]

class Like(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ip = models.GenericIPAddressField()
    date = models.DateTimeField(auto_now=True)

class CommentLike(models.Model):
    comment = models.ForeignKey('Comment', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s %s' % (self.user.first_name, self.user.last_name)

    def conversation(self):
        return self.comment.conversation

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    text = models.TextField()
    date = models.DateTimeField(auto_now=True)
    replies = models.ManyToManyField('Comment')

    def fullname(self):
        return '%s %s' %(self.user.first_name, self.user.last_name)

    def likes(self):
        return CommentLike.objects.filter(comment=self.id).count()

    class Meta:
        ordering = ['-date',]

class Profile(models.Model):
    GENDER = (
        ('male', 'Male'),
        ('female', 'Female')
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=7, choices=GENDER, blank=True, null=True)

    def profile_image(self):
        if not self.avatar:
            return '/static/images/user.svg'
        else:
            return self.avatar.url

    def __str__(self):
        return '%s %s' % (self.user.first_name, self.user.last_name)

class Subscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    subscription = models.TextField()
    date = models.DateTimeField(auto_now=True)
    is_invalid = models.BooleanField(default=False)
