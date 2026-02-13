# apps/accounts/api/views.py
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model
from apps.accounts.models import Company
from apps.jobs.models import Job  # предполагаем, что модели jobs лежат здесь

from .serializers import TrialStatusSerializer


# Soft-limits для trial (можно будет позже поменять числа в одном месте)
TRIAL_JOBS_SOFT_LIMIT_PER_DAY = 20
TRIAL_CLEANERS_SOFT_LIMIT = 5

User = get_user_model()


class StartStandardTrialView(APIView):
    """
    Старт / возврат инфы по 7-дневному trial-плану для компании текущего пользователя.

    URL: POST /api/cleanproof/trials/start/
    Требует: авторизацию (Token / JWT — как уже настроено в проекте).

    Body (optional):
    - tier: "standard" | "pro" | "enterprise" (default: "standard")
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        company: Company = user.company

        # Get tier from request body (default to standard)
        tier = request.data.get("tier", Company.TIER_STANDARD)
        if tier not in [Company.TIER_STANDARD, Company.TIER_PRO, Company.TIER_ENTERPRISE]:
            tier = Company.TIER_STANDARD

        now = timezone.now()

        # Если trial уже активен и не истёк — обновляем tier если нужно и возвращаем статус
        if company.trial_expires_at and company.trial_expires_at > now and company.plan == Company.PLAN_TRIAL:
            # Update tier if different
            if company.plan_tier != tier:
                company.plan_tier = tier
                company.save(update_fields=["plan_tier"])
            data = self._serialize_company(company)
            return Response(data, status=status.HTTP_200_OK)

        # В DEV-среде сознательно разрешаем перезапуск trial
        # (в проде это правило можно будет ужесточить)
        from datetime import timedelta

        company.plan = Company.PLAN_TRIAL
        company.plan_tier = tier
        company.trial_started_at = now
        company.trial_expires_at = now + timedelta(days=7)
        company.updated_at = now
        company.save(
            update_fields=[
                "plan",
                "plan_tier",
                "trial_started_at",
                "trial_expires_at",
                "updated_at",
            ]
        )

        data = self._serialize_company(company)
        return Response(data, status=status.HTTP_200_OK)

    def _serialize_company(self, company: Company):
        """
        Единая точка сериализации trial-состояния компании.
        Логика завязана на методы Company, чтобы не расходиться.
        """
        is_active = company.is_trial_active
        is_expired = company.is_trial_expired()
        days_left = company.trial_days_left()

        serializer = TrialStatusSerializer(
            {
                "plan": company.plan,
                "plan_tier": company.plan_tier,
                "trial_started_at": company.trial_started_at,
                "trial_expires_at": company.trial_expires_at,
                "is_trial_active": is_active,
                "is_trial_expired": is_expired,
                "days_left": days_left,
            }
        )
        return serializer.data


class UsageSummaryView(APIView):
    """
    Краткая сводка по trial и usage для менеджера.

    URL: GET /api/cleanproof/usage-summary/
    Требует: авторизацию.

    Назначение:
    - дать фронту одну точку правды:
      * trial-план и статус
      * кол-во job за сегодня + soft-limit
      * кол-во активных клинеров + soft-limit
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        company: Company = user.company

        # Paid status — plan == active
        is_paid = company.plan == Company.PLAN_ACTIVE

        # Trial-состояние — через методы Company
        is_active = company.is_trial_active
        is_expired = company.is_trial_expired()
        days_left = company.trial_days_left()

        # Usage: jobs за сегодня (кроме отменённых)
        today = timezone.localdate()
        jobs_today_count = (
            Job.objects.filter(
                company=company,
                scheduled_date=today,
            )
            .exclude(status="cancelled")
            .count()
        )

        # Usage: кол-во активных клинеров
        cleaners_count = (
            User.objects.filter(
                company=company,
                role="cleaner",
                is_active=True,
            ).count()
        )

        data = {
            "plan": company.plan,
            "plan_tier": company.plan_tier,
            "is_paid": is_paid,
            "is_trial_active": is_active,
            "is_trial_expired": is_expired,
            "days_left": days_left,
            "jobs_today_count": jobs_today_count,
            "jobs_today_soft_limit": TRIAL_JOBS_SOFT_LIMIT_PER_DAY,
            "cleaners_count": cleaners_count,
            "cleaners_soft_limit": TRIAL_CLEANERS_SOFT_LIMIT,
        }

        return Response(data, status=status.HTTP_200_OK)


class UpgradeToActiveView(APIView):
    """
    Апгрейд с trial на active (платный) план.

    URL: POST /api/cleanproof/upgrade-to-active/
    Требует: авторизацию.

    Body (optional):
    - tier: "standard" | "pro" | "enterprise"

    Назначение:
    - Переключает company.plan с "trial" на "active"
    - Опционально устанавливает plan_tier
    - Идемпотентно: если уже active — только обновляем tier при необходимости
    - Возвращает обновлённый статус компании
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        company: Company = user.company

        # Get tier from request body (optional)
        tier = request.data.get("tier")

        # Переводим в active plan с опциональным tier
        company.upgrade_to_active(tier=tier)

        # Возвращаем обновлённый статус
        data = {
            "plan": company.plan,
            "plan_tier": company.plan_tier,
            "trial_started_at": company.trial_started_at,
            "trial_expires_at": company.trial_expires_at,
            "is_trial_active": company.is_trial_active,
            "is_trial_expired": company.is_trial_expired(),
            "days_left": company.trial_days_left(),
        }

        return Response(data, status=status.HTTP_200_OK)
