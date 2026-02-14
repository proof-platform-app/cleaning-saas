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
    Разрешаем доступ консольным пользователям (owner, manager, staff).
    Используется для manager / analytics / reports эндпоинтов.

    Role hierarchy:
    - owner: Billing Admin, full access
    - manager: Ops Admin, full access to operations
    - staff: Limited console access
    - cleaner: Mobile app only (excluded)
    """

    message = "Only console users (owner, manager, staff) can access this resource."

    # Console roles that have access to manager endpoints
    CONSOLE_ROLES = {"owner", "manager", "staff"}

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Check if user has a console role
        role = getattr(user, "role", None)
        if role and role in self.CONSOLE_ROLES:
            return True

        return False
