from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class Company(models.Model):
    """
    Таблица companies.
    """

    name = models.CharField(max_length=100)
    logo_url = models.TextField(null=True, blank=True)
    contact_email = models.EmailField(max_length=255, null=True, blank=True)
    contact_phone = models.CharField(max_length=20, null=True, blank=True)

    default_work_start_time = models.TimeField(default="08:00:00")
    default_work_end_time = models.TimeField(default="17:00:00")

    notification_email = models.EmailField(max_length=255, null=True, blank=True)
    notification_enabled = models.BooleanField(default=False)
    ramadan_mode_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "companies"

    def __str__(self) -> str:
        return self.name


class UserManager(BaseUserManager):
    """
    Кастомный менеджер для users.
    """

    def _create_user(self, email, phone, password, **extra_fields):
        role = extra_fields.get("role")

        if role == "manager" and not email:
            raise ValueError("Manager must have an email")
        if role == "cleaner" and not phone:
            raise ValueError("Cleaner must have a phone")

        email = self.normalize_email(email) if email else None
        user = self.model(email=email, phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email=None, phone=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        if "role" not in extra_fields:
            extra_fields["role"] = "cleaner"
        return self._create_user(email, phone, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", "manager")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email=email, phone=None, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Таблица users.
    """

    ROLE_MANAGER = "manager"
    ROLE_CLEANER = "cleaner"

    ROLE_CHOICES = [
        (ROLE_MANAGER, "Manager"),
        (ROLE_CLEANER, "Cleaner"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="users",
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    # Django будет использовать это поле как password,
    # но в БД колонка называется password_hash, как в схеме.
    password = models.CharField(
        max_length=255,
        db_column="password_hash",
        blank=True,
    )

    pin_hash = models.CharField(max_length=255, null=True, blank=True)

    full_name = models.CharField(max_length=100)
    photo_url = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"
        constraints = [
            models.CheckConstraint(
                check=models.Q(role__in=["manager", "cleaner"]),
                name="users_role_valid",
            ),
        ]

    def __str__(self) -> str:
        return self.full_name or (self.email or self.phone or f"User {self.pk}")
