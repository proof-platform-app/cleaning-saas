from rest_framework.exceptions import PermissionDenied

def enforce_company_is_active(company):
    """
    Бросает 403, если компания выключена.
    Используем перед любыми action-ами, меняющими состояние.
    """
    if company is None:
        return

    if not getattr(company, "is_active", True):
        raise PermissionDenied(
            detail={
                "code": "company_suspended",
                "message": "Your company account is suspended. Please contact support.",
            }
        )
