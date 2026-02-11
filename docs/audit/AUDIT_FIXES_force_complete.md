# AUDIT FIXES: Force-Complete View

## Critical Risks #1, #3, #4: Force-Complete Hybrid Verified Model

**Location:** `backend/apps/api/views_manager_jobs.py:746-897`

### New Implementation (Complete Replacement)

```python
class ManagerJobForceCompleteView(APIView):
    """
    Force-complete job (manager override).

    POST /api/manager/jobs/<id>/force-complete/

    AUDIT FIXES:
    - Critical Risk #1: Block force-complete from scheduled (must check in first)
    - Critical Risk #3: Transitions to completed_unverified (not completed)
    - Critical Risk #4: Persist audit fields (verification_override, force_completed_at, etc.)

    Hybrid Verified Model:
    - Only allowed when job is in_progress (cleaner already checked in with GPS)
    - Transitions to completed_unverified (separated from verified completions)
    - Requires reason text
    - All audit metadata persisted
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can force-complete jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            if code == "trial_expired":
                detail = (
                    "Your free trial has ended. You can still view existing jobs and "
                    "download reports, but overriding jobs requires an upgrade."
                )
            else:
                detail = "Your account is currently blocked. Please contact support."

            return Response(
                {"code": code, "detail": detail},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner"),
            pk=pk,
            company=company,
        )

        # AUDIT FIX: Block if already completed or completed_unverified
        if job.status in (Job.STATUS_COMPLETED, Job.STATUS_COMPLETED_UNVERIFIED):
            return Response(
                {"detail": "Job is already completed and cannot be force-completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # AUDIT FIX: Critical Risk #1 - Must be in_progress (check-in already happened)
        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {
                    "detail": (
                        "Force-complete is only allowed for jobs in progress. "
                        "The cleaner must check in first to establish GPS proof. "
                        f"Current status: {job.status}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate reason
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return Response(
                {"detail": "Reason is required (text explanation for force-complete)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        # AUDIT FIX: Critical Risk #3 - Transition to completed_unverified
        job.status = Job.STATUS_COMPLETED_UNVERIFIED

        # Set actual_end_time if not already set
        if not job.actual_end_time:
            job.actual_end_time = now

        # AUDIT FIX: Critical Risk #4 - Persist audit fields (now exist on model)
        job.verification_override = True
        job.force_completed_at = now
        job.force_completed_by = user
        job.force_complete_reason = reason

        job.save(update_fields=[
            "status",
            "actual_end_time",
            "verification_override",
            "force_completed_at",
            "force_completed_by_id",
            "force_complete_reason",
        ])

        # Create audit event (TYPE_FORCE_COMPLETE now exists in model)
        JobCheckEvent.objects.create(
            job=job,
            user=user,
            event_type=JobCheckEvent.TYPE_FORCE_COMPLETE,
            # No GPS coordinates (this is the override point)
        )

        response_data = {
            "id": job.id,
            "status": job.status,
            "verification_override": job.verification_override,
            "force_completed_at": job.force_completed_at.isoformat(),
            "force_completed_by": {
                "id": user.id,
                "full_name": getattr(user, "full_name", "") or getattr(user, "email", ""),
            },
            "force_complete_reason": job.force_complete_reason,
        }

        return Response(response_data, status=status.HTTP_200_OK)
```

---

## Key Changes

### 1. Status Check (Critical Risk #1)
**Before:**
```python
if job.status == Job.STATUS_COMPLETED:
    return Response({"detail": "Job is already completed ..."}, ...)
```

**After:**
```python
# Block if already completed
if job.status in (Job.STATUS_COMPLETED, Job.STATUS_COMPLETED_UNVERIFIED):
    return Response({"detail": "Job is already completed ..."}, ...)

# MUST be in_progress (check-in already happened with GPS proof)
if job.status != Job.STATUS_IN_PROGRESS:
    return Response({
        "detail": "Force-complete is only allowed for jobs in progress. "
                  "The cleaner must check in first to establish GPS proof."
    }, ...)
```

### 2. Status Transition (Critical Risk #3)
**Before:**
```python
job.status = Job.STATUS_COMPLETED
```

**After:**
```python
job.status = Job.STATUS_COMPLETED_UNVERIFIED
```

### 3. Audit Fields (Critical Risk #4)
**Before:**
```python
try:
    job.force_completed = True  # Field doesn't exist
except Exception:
    pass
```

**After:**
```python
job.verification_override = True
job.force_completed_at = now
job.force_completed_by = user
job.force_complete_reason = reason

job.save(update_fields=[
    "status",
    "actual_end_time",
    "verification_override",
    "force_completed_at",
    "force_completed_by_id",
    "force_complete_reason",
])
```

### 4. Reason Required
**Before:**
```python
reason_code = (request.data.get("reason_code") or "").strip()
comment = (request.data.get("comment") or "").strip()

# Validated reason_code from predefined list + comment
```

**After:**
```python
reason = (request.data.get("reason") or "").strip()
if not reason:
    return Response({"detail": "Reason is required ..."}, ...)

# Free-text reason (more flexible for edge cases)
```

---

## Guarantees After Fix

1. ✅ Force-complete **requires check-in first** (GPS proof established)
2. ✅ Force-complete transitions to `completed_unverified` (separated from verified jobs)
3. ✅ All audit metadata persisted (`verification_override`, `force_completed_at`, `force_completed_by`, `force_complete_reason`)
4. ✅ Analytics can filter `completed_unverified` separately
5. ✅ Audit trail complete (JobCheckEvent with TYPE_FORCE_COMPLETE)

## Breaking Change

**API Contract Change:**
- Request body: `reason_code` + `comment` → `reason` (free text)
- Response: Returns new fields (`verification_override`, `force_complete_reason`)
- Status transition: `in_progress` → `completed_unverified` (not `completed`)

Frontend must be updated to:
1. Accept only in_progress jobs for force-complete
2. Show `completed_unverified` status as "Completed (Unverified)" or similar
3. Filter analytics to exclude unverified jobs from standard KPIs
