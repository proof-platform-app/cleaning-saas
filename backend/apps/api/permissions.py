from rest_framework.permissions import BasePermission

class IsCompanyActive(BasePermission):
    """
    Разрешаем только если company.is_active = True.
    Ожидаем, что у request.user есть .company.
    """

    message = "Your company account is suspended. Please contact support."

    def has_permission(self, request, view):
        user = request.user
        company = getattr(user, "company", None)
        if company is None:
            return True  # на всякий случай, не ломаем анонимные эндпоинты
        return getattr(company, "is_active", True)
