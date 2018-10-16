from django import forms
from iconnect.models import Category, Conversation, Comment
from iconnect.widgets import CategoryWidget

class ConversationForm(forms.ModelForm):
    latitude = forms.CharField( widget=forms.HiddenInput() )
    longitude = forms.CharField( widget=forms.HiddenInput() )
    city = forms.CharField( widget=forms.HiddenInput() )
    state = forms.CharField( widget=forms.HiddenInput() )
    country = forms.CharField( widget=forms.HiddenInput() )
    category = forms.ModelChoiceField( queryset=Category.objects.all(), to_field_name="title", widget=forms.RadioSelect(), empty_label=None )
    text = forms.CharField( widget=forms.Textarea(attrs={ 'class': 'textarea', 'placeholder': 'Write your expectation here...' , 'rows': 5 }) )

    class Meta:
        model = Conversation
        fields = ['text', 'category', 'city', 'state', 'country', 'longitude', 'latitude']

class CommentForm(forms.ModelForm):
    text = forms.CharField(widget=forms.Textarea(attrs={ 'class': 'textarea', 'placeholder': 'Write a response...' , 'rows': 2 }))
    class Meta:
        model = Comment
        fields = ['text',]

class ProfileForm(forms.Form):
    GENDER = (
        ('male', 'Male'),
        ('female', 'Female'),
    )
    first_name = forms.CharField( widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'First name'}), required=True )
    avatar = forms.ImageField(required=False)
    last_name = forms.CharField( widget=forms.TextInput(attrs={'class': 'input', 'placeholder': 'Last name'}), required=True )
    gender = forms.ChoiceField(choices=GENDER)
    age = forms.CharField( widget=forms.NumberInput(attrs={'class': 'input', 'placeholder': 'e.g 24', 'size': 4}) )
