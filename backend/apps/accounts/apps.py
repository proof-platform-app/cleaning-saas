from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    # путь к приложению
    name = "apps.accounts"
    # явный app_label, чтобы работал AUTH_USER_MODEL = "apps_accounts.User"
    label = "apps_accounts"
