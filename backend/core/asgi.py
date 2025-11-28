import os

from django.core.asgi import get_asgi_application

# CHANGED: uLostIfound.settings -> core.settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_asgi_application()