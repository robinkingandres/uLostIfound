import os

from django.core.wsgi import get_wsgi_application

# CHANGED: uLostIfound.settings -> core.settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_wsgi_application()