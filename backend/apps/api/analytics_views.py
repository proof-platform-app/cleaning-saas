# apps/api/analytics_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import IsManagerUser as IsManager


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_summary(request):
    # TODO: заменить заглушку на реальную агрегацию по ANALYTICS_API_V1
    data = {
        "jobs_completed": 0,
        "on_time_completion_rate": 0.0,
        "proof_completion_rate": 0.0,
        "avg_job_duration_hours": 0.0,
        "issues_detected": 0,
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_jobs_completed(request):
    # TODO: реальный расчёт
    return Response([])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_job_duration(request):
    # TODO: реальный расчёт
    return Response([])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_proof_completion(request):
    # TODO: реальный расчёт
    return Response([])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_cleaners_performance(request):
    # TODO: реальный расчёт
    return Response([])
