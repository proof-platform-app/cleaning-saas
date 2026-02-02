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


class IsManagerUser(BasePermission):
    """
    Разрешаем доступ только менеджерам.
    Используется для manager / analytics / reports эндпоинтов.
    """

    message = "Only managers can access this resource."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Вариант 1: явный флаг
        if hasattr(user, "is_manager"):
            return bool(user.is_manager)

        # Вариант 2: role = "manager"
        if hasattr(user, "role"):
            return getattr(user, "role", None) == "manager"

        # Временный fallback — пускаем аутентифицированных
        # (пока роли не зафиксированы жёстко)
        return True
