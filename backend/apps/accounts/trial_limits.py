# backend/apps/accounts/trial_limits.py
from __future__ import annotations

from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied

from .models import Company


def ensure_can_add_cleaner(company: Company) -> None:
    """
    Бросает 403 с понятным detail, если на trial достигнут лимит по клинерам.
    """
    if not company.is_trial_active:
        return

    if company.trial_cleaners_limit_reached():
        # DRF PermissionDenied -> {"detail": "..."} + HTTP 403
        raise PermissionDenied(
            _(
                "Trial limit reached: you can add up to %(limit)d cleaners on trial."
            )
            % {"limit": company.TRIAL_MAX_CLEANERS}
        )


def ensure_can_create_job(company: Company) -> None:
    """
    Бросает 403 с понятным detail, если на trial достигнут лимит по jobs.
    """
    if not company.is_trial_active:
        return

    if company.trial_jobs_limit_reached():
        raise PermissionDenied(
            _(
                "Trial limit reached: you can create up to %(limit)d jobs on trial."
            )
            % {"limit": company.TRIAL_MAX_JOBS}
        )
