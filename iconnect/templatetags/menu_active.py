from django import template

register = template.Library()

def is_menu_active(value, args):
    """ Check to see if a menu is active """
    if value == int(args):
        return 'is-active'

register.filter('is_menu_active', is_menu_active)

def is_location_active(value, args):
    """ Check to see if a location is active """
    if value == args:
        return 'is-active'

register.filter('is_location_active', is_location_active)

@register.simple_tag(takes_context=True)
def querystring(context, **kwargs):
    """
    Creates a URL (containing only the querystring [including "?"]) derived
    from the current URL's querystring, by updating it with the provided
    keyword arguments.

    Example (imagine URL is ``/abc/?gender=male&name=Tim``)::

        {% querystring "name"="Diego" "age"=20 %}
        ?name=Diego&gender=male&age=20
    """
    request = context['request']
    updated = request.GET.copy()
    for k, v in kwargs.items():  # have to iterate over and not use .update as it's a QueryDict not a dict
        updated[k] = v

    return '?{}'.format(updated.urlencode()) if updated else ''
