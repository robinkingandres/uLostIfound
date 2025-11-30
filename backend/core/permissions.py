from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to users with the 'Admin' role or Superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role == 'Admin' or request.user.is_superuser
        ))

class IsStudentOrTeacher(permissions.BasePermission):
    """
    Allows access to Students and Teachers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.user.role in ['Student', 'Teacher']
        ))