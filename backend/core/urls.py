from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

# Simple view to handle the root URL
def home(request):
    return HttpResponse("<h1>Welcome to uLostIfound Backend</h1><p>Go to <a href='/admin/'>Admin Panel</a> or <a href='/api/'>API</a></p>")

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints from the users app
    path('api/', include('users.urls')),
    # API endpoints for the new reports app <-- ADD THIS LINE
    path('api/', include('reports.urls')),
    # Root URL handler
    path('', home),
]

# Serve media files in development (for avatars)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)