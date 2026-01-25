# apps/accounts/api/views.py
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company
from .serializers import TrialStatusSerializer


class StartStandardTrialView(APIView):
    """
    Старт / возврат инфы по 7-дневному trial-плану для компании текущего пользователя.

    URL: POST /api/cleanproof/trials/start/
    Требует: авторизацию (Token / JWT — как уже настроено в проекте).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        company: Company = user.company

        now = timezone.now()

        # Если trial уже активен и не истёк — просто возвращаем статус
        if (
            company.trial_expires_at
            and company.trial_expires_at > now
            and company.plan == "trial"
        ):
            data = self._serialize_company(company, now)
            return Response(data, status=status.HTTP_200_OK)

        # В DEV-среде сознательно разрешаем перезапуск trial
        # (в проде это правило можно будет ужесточить)
        from datetime import timedelta

        company.plan = "trial"
        company.trial_started_at = now
        company.trial_expires_at = now + timedelta(days=7)
        company.updated_at = now
        company.save(
            update_fields=[
                "plan",
                "trial_started_at",
                "trial_expires_at",
                "updated_at",
            ]
        )

        data = self._serialize_company(company, now)
        return Response(data, status=status.HTTP_200_OK)

    def _serialize_company(self, company: Company, now):
        if company.trial_expires_at:
            delta = company.trial_expires_at.date() - now.date()
            days_left = max(delta.days, 0)
        else:
            days_left = None

        is_expired = bool(
            company.trial_expires_at and company.trial_expires_at <= now
        )
        is_active = company.plan == "trial" and not is_expired

        serializer = TrialStatusSerializer(
            {
                "plan": company.plan,
                "trial_started_at": company.trial_started_at,
                "trial_expires_at": company.trial_expires_at,
                "is_trial_active": is_active,
                "is_trial_expired": is_expired,
                "days_left": days_left,
            }
        )
        return serializer.data
