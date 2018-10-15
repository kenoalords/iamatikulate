from django.urls import path
from django.conf.urls.static import static
from django.conf import settings
from django.views.generic import TemplateView
from iconnect.views import IndexView, PostConversationView, ViewConversation, ExploreView, PostLike, DashboardView, ProfileView, DashboardLikesView, HowItWorksView, ApprovePendingPost, PendingPostView

app_name = 'iconnect'

urlpatterns = [
    path('', IndexView.as_view(), name="home"),
    path('share/', PostConversationView.as_view(), name="post"),
    path('post/<uuid>', ViewConversation.as_view(), name="view"),
    path('post/<uuid>/approve', ApprovePendingPost.as_view(), name="approve_post"),
    path('explore/', ExploreView.as_view(), name="explore"),
    path('like/', PostLike.as_view(), name="like"),
    path('how-it-works/', HowItWorksView.as_view(), name="how_it_works"),
    path('privacy-policy/', TemplateView.as_view(template_name='pages/privacy_policy.html'), name="privacy_policy"),
    path('dashboard/', DashboardView.as_view(), name="dashboard"),
    path('dashboard/profile', ProfileView.as_view(), name="profile"),
    path('dashboard/likes', DashboardLikesView.as_view(), name="likes"),
    path('dashboard/pending-posts', PendingPostView.as_view(), name="pending_posts"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
