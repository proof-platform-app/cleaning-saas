from django.conf import settings
from django.core.mail import send_mail
from rest_framework import generics, permissions

from .models import DemoRequest, ContactMessage
from .serializers import DemoRequestSerializer, ContactMessageSerializer


class DemoRequestCreateView(generics.CreateAPIView):
    """
    Public endpoint: POST /api/public/demo-requests/
    """

    queryset = DemoRequest.objects.all()
    serializer_class = DemoRequestSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        instance: DemoRequest = serializer.save()

        founder_email = getattr(settings, "FOUNDER_DEMO_EMAIL", None)
        if not founder_email:
            # просто сохранили в БД, уведомление не шлём
            return

        lines = [
            f"Company: {instance.company_name}",
            f"Role: {instance.role or '-'}",
            f"Cleaners: {instance.cleaner_count or '-'}",
            f"Country: {instance.country or '-'}",
            f"Primary pain: {instance.primary_pain or '-'}",
            f"Contact: {instance.contact}",
            "",
            f"Created at: {instance.created_at.isoformat()}",
        ]

        try:
            send_mail(
                subject=f"[CleanProof] New demo request from {instance.company_name}",
                message="\n".join(lines),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", founder_email),
                recipient_list=[founder_email],
                fail_silently=True,
            )
        except Exception:
            # TODO: можно добавить нормальное логирование
            pass

class ContactMessageCreateView(generics.CreateAPIView):
    """
    Public endpoint: POST /api/public/contact-messages/
    """

    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        instance: ContactMessage = serializer.save()

        founder_email = getattr(settings, "FOUNDER_DEMO_EMAIL", None)
        if not founder_email:
            return

        lines = [
            f"Name: {instance.name}",
            f"Company: {instance.company or '-'}",
            f"Email: {instance.email}",
            "",
            "Message:",
            instance.message,
        ]

        try:
            send_mail(
                subject=f"[CleanProof] New contact message from {instance.name}",
                message="\n".join(lines),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", founder_email),
                recipient_list=[founder_email],
                fail_silently=True,
            )
        except Exception:
            pass
