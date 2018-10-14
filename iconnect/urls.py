from django.urls import path
from iconnect.views import IndexView, PostConversationView, ViewConversation, ExploreView, PostLike, DashboardView, ProfileView, DashboardLikesView, HowItWorksView

app_name = 'iconnect'

urlpatterns = [
    path('', IndexView.as_view(), name="home"),
    path('share/', PostConversationView.as_view(), name="post"),
    path('post/<uuid>', ViewConversation.as_view(), name="view"),
    path('explore/', ExploreView.as_view(), name="explore"),
    path('like/', PostLike.as_view(), name="like"),
    path('how-it-works/', HowItWorksView.as_view(), name="how_it_works"),
    path('dashboard/', DashboardView.as_view(), name="dashboard"),
    path('dashboard/profile', ProfileView.as_view(), name="profile"),
    path('dashboard/likes', DashboardLikesView.as_view(), name="likes"),
]
