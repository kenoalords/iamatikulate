from django import forms

class CategoryWidget(forms.Widget):
    def render(self, name, value, attrs):
        return 'Hello'
