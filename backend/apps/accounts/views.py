from django.shortcuts import render

# Create your views here.
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company
from .serializers import TrialStatusSerializer


class StartStandardTrialView(APIView):
    """
    POST /api/cleanproof/trials/start/

    Требует аутентификацию.
    Стартует 7-дневный trial для компании, если он ещё не активен.
    Ничего не ломает для существующих активных компаний.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        company: Company = user.company  # как в других местах проекта

        # Уже активный платный план — считаем, что всё ок, просто отдаем статус
        if company.plan == Company.PLAN_ACTIVE:
            serializer = TrialStatusSerializer(company)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Trial уже был и истёк — не перезапускаем автоматически
        if company.is_trial_expired():
            serializer = TrialStatusSerializer(company)
            return Response(serializer.data, status=status.HTTP_409_CONFLICT)

        # Во всех остальных случаях запускаем trial (метод внутри модели Company)
        company.start_standard_trial(days=7)
        serializer = TrialStatusSerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)
