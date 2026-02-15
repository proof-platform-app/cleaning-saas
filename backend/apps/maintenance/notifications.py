"""
Maintenance Notification Service (Stage 6)

Email notifications for maintenance visits.
All notifications are logged in MaintenanceNotificationLog for audit trail.

See: docs/product/MAINTENANCE_V2_STRATEGY.md (Stage 6)
"""

from django.core.mail import send_mail
from django.conf import settings
from typing import Tuple

from apps.maintenance.models import MaintenanceNotificationLog


def send_maintenance_notification(
    company,
    kind: str,
    job,
    to_email: str,
    recipient_user=None,
    triggered_by=None,
) -> bool:
    """
    Send a maintenance email notification and log it.

    Args:
        company: Company instance
        kind: Notification type (visit_reminder, sla_warning, assignment, completion)
        job: Job instance for the notification
        to_email: Recipient email address
        recipient_user: Optional User instance for the recipient
        triggered_by: Optional User instance who triggered the notification

    Returns:
        True if sent successfully, False otherwise.
    """
    subject, body = _build_email_content(kind, job)

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
        status = MaintenanceNotificationLog.STATUS_SENT
        error = ""
    except Exception as e:
        status = MaintenanceNotificationLog.STATUS_FAILED
        error = str(e)

    # Log the notification
    MaintenanceNotificationLog.objects.create(
        company=company,
        kind=kind,
        status=status,
        job=job,
        to_email=to_email,
        recipient_user=recipient_user,
        subject=subject,
        error_message=error,
        triggered_by=triggered_by,
    )

    return status == MaintenanceNotificationLog.STATUS_SENT


def _build_email_content(kind: str, job) -> Tuple[str, str]:
    """
    Build subject and body for notification type.

    Args:
        kind: Notification type
        job: Job instance

    Returns:
        Tuple of (subject, body)
    """
    # Helper to get safe values
    location_name = job.location.name if job.location else "Unknown Location"
    asset_name = job.asset.name if job.asset else "N/A"
    technician_name = job.cleaner.full_name if job.cleaner else "Unassigned"
    scheduled_time = job.scheduled_start_time or "Not specified"
    sla_deadline = job.sla_deadline or "Not set"

    if kind == MaintenanceNotificationLog.KIND_VISIT_REMINDER:
        subject = f"Reminder: Service visit scheduled for {job.scheduled_date}"
        body = f"""You have a service visit scheduled:

Location: {location_name}
Date: {job.scheduled_date}
Time: {scheduled_time}
Asset: {asset_name}

Please ensure you are prepared for this visit.

---
MaintainProof Notifications"""

    elif kind == MaintenanceNotificationLog.KIND_SLA_WARNING:
        subject = f"SLA Warning: Visit #{job.id} approaching deadline"
        body = f"""Warning: A service visit is approaching its SLA deadline.

Visit ID: #{job.id}
Location: {location_name}
Scheduled Date: {job.scheduled_date}
SLA Deadline: {sla_deadline}

Please take action to complete this visit before the deadline.

---
MaintainProof Notifications"""

    elif kind == MaintenanceNotificationLog.KIND_ASSIGNMENT:
        subject = f"New assignment: Service visit at {location_name}"
        body = f"""You have been assigned a new service visit:

Location: {location_name}
Date: {job.scheduled_date}
Time: {scheduled_time}
Asset: {asset_name}

Notes: {job.manager_notes or 'None'}

---
MaintainProof Notifications"""

    elif kind == MaintenanceNotificationLog.KIND_COMPLETION:
        subject = f"Visit completed: {location_name}"
        body = f"""A service visit has been completed:

Visit ID: #{job.id}
Location: {location_name}
Technician: {technician_name}
Completed: {job.actual_end_time or 'N/A'}

Status: {job.get_status_display() if hasattr(job, 'get_status_display') else job.status}

---
MaintainProof Notifications"""

    else:
        # Fallback for unknown kind
        subject = f"Maintenance Notification: Visit #{job.id}"
        body = f"""Notification about service visit #{job.id}

Location: {location_name}
Date: {job.scheduled_date}

---
MaintainProof Notifications"""

    return subject, body


def send_assignment_notification(job, triggered_by=None) -> bool:
    """
    Send assignment notification to the technician.
    Called when a visit is created or technician is changed.

    Returns True if sent, False otherwise.
    """
    if not job.cleaner or not job.cleaner.email:
        return False

    return send_maintenance_notification(
        company=job.company,
        kind=MaintenanceNotificationLog.KIND_ASSIGNMENT,
        job=job,
        to_email=job.cleaner.email,
        recipient_user=job.cleaner,
        triggered_by=triggered_by,
    )


def send_completion_notification(job, manager_email: str, triggered_by=None) -> bool:
    """
    Send completion notification to the manager.
    Called when a visit is marked as completed.

    Returns True if sent, False otherwise.
    """
    return send_maintenance_notification(
        company=job.company,
        kind=MaintenanceNotificationLog.KIND_COMPLETION,
        job=job,
        to_email=manager_email,
        recipient_user=None,  # Manager may not be a specific user
        triggered_by=triggered_by,
    )
