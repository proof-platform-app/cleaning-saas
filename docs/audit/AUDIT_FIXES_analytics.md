# AUDIT FIXES: Analytics Filtering for completed_unverified

## Objective

Ensure that `completed_unverified` jobs are **excluded** from standard KPI metrics but **tracked separately** for transparency.

Standard verified completion metrics should only count `STATUS_COMPLETED`.

---

## 1. Core Filter Pattern Change

**File:** `backend/apps/api/analytics_views.py`

### Current Pattern (Multiple locations)
```python
qs = Job.objects.filter(
    company=company,
    status=Job.STATUS_COMPLETED,
    actual_end_time__isnull=False,
    actual_end_time__date__gte=date_from,
    actual_end_time__date__lte=date_to,
)
```

### Updated Pattern
```python
# Standard verified completions only
qs = Job.objects.filter(
    company=company,
    status=Job.STATUS_COMPLETED,  # Excludes completed_unverified
    actual_end_time__isnull=False,
    actual_end_time__date__gte=date_from,
    actual_end_time__date__lte=date_to,
)
```

**Why this works:**
`status=Job.STATUS_COMPLETED` is an exact match filter, so jobs with `status=Job.STATUS_COMPLETED_UNVERIFIED` are automatically excluded.

---

## 2. Affected Functions (No Change Required)

All analytics functions already filter by exact `status=Job.STATUS_COMPLETED`, so they will **automatically** exclude `completed_unverified` jobs:

### Lines to verify (no changes needed):
- `_calculate_summary_for_range()` — line 48-54
- `analytics_jobs_completed()` — line 306-312
- `analytics_violations_trend()` — line 394-401
- `analytics_job_duration()` — line 500-508
- `analytics_proof_completion()` — line 604-611
- `analytics_sla_breakdown()` — line 766-773
- `analytics_locations_performance()` — line 961-969
- `analytics_cleaners_performance()` — line 1139-1147

**Result:** All standard KPIs (jobs_completed, on_time_rate, proof_rate, avg_duration, issues, etc.) will only count verified completions.

---

## 3. Add New Endpoint: Unverified Completions Tracking

**Optional:** Create a new analytics endpoint to track unverified completions separately for transparency.

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_unverified_completions(request):
    """
    GET /api/manager/analytics/unverified-completions/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Track jobs completed via manager override (force-complete).

    Returns:
    {
        "total_unverified": 5,
        "unverified_jobs": [
            {
                "job_id": 123,
                "scheduled_date": "2026-01-15",
                "location_name": "Dubai Marina",
                "cleaner_name": "Ahmed Hassan",
                "force_completed_at": "2026-01-16T14:30:00Z",
                "force_completed_by": "Manager Name",
                "force_complete_reason": "Emergency completion due to cleaner illness"
            },
            ...
        ]
    }
    """
    user = request.user
    company = getattr(user, "company", None)

    if not company:
        return Response(
            {"detail": "Manager has no company."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    date_from_str = (request.query_params.get("date_from") or "").strip()
    date_to_str = (request.query_params.get("date_to") or "").strip()

    if not date_from_str or not date_to_str:
        return Response(
            {"detail": "date_from and date_to query params are required: YYYY-MM-DD"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
        date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return Response(
            {"detail": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if date_from > date_to:
        return Response(
            {"detail": "date_from cannot be greater than date_to."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Query unverified completions
    qs = (
        Job.objects.filter(
            company=company,
            status=Job.STATUS_COMPLETED_UNVERIFIED,
            actual_end_time__isnull=False,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
        )
        .select_related("location", "cleaner", "force_completed_by")
        .order_by("-force_completed_at")
    )

    total_unverified = qs.count()

    unverified_jobs = []
    for job in qs:
        unverified_jobs.append({
            "job_id": job.id,
            "scheduled_date": job.scheduled_date.isoformat() if job.scheduled_date else None,
            "location_name": getattr(job.location, "name", "") or "—",
            "cleaner_name": getattr(job.cleaner, "full_name", "") or getattr(job.cleaner, "email", "") or "—",
            "force_completed_at": job.force_completed_at.isoformat() if job.force_completed_at else None,
            "force_completed_by": (
                getattr(job.force_completed_by, "full_name", "") or
                getattr(job.force_completed_by, "email", "")
                if job.force_completed_by else "—"
            ),
            "force_complete_reason": job.force_complete_reason or "",
        })

    data = {
        "total_unverified": total_unverified,
        "unverified_jobs": unverified_jobs,
    }

    return Response(data, status=status.HTTP_200_OK)
```

### Add to URL routing:
```python
# backend/apps/api/urls.py
path(
    "manager/analytics/unverified-completions/",
    analytics_unverified_completions,
    name="analytics-unverified-completions",
),
```

---

## 4. Manager Portal Updates (Frontend)

### Jobs Listing
Update job status display:
```typescript
// Before
const statusLabel = job.status === "completed" ? "Completed" : ...

// After
const statusLabel =
    job.status === "completed" ? "Completed (Verified)" :
    job.status === "completed_unverified" ? "Completed (Unverified)" :
    ...
```

### Analytics Dashboard
Add transparency card:
```typescript
<Card title="Unverified Completions">
  <Stat value={unverifiedCount} label="Force-Completed Jobs" />
  <Text>
    Jobs completed via manager override (no full proof verification).
    These are excluded from standard KPIs.
  </Text>
  <Button onClick={() => navigate("/analytics/unverified")}>
    View Details
  </Button>
</Card>
```

---

## 5. Manager Job Details View

Show verification status clearly:

```typescript
{job.verification_override && (
  <Alert status="warning">
    <AlertIcon />
    <AlertTitle>Unverified Completion</AlertTitle>
    <AlertDescription>
      This job was force-completed by {job.force_completed_by?.full_name} on{" "}
      {formatDate(job.force_completed_at)}.
      <br />
      <strong>Reason:</strong> {job.force_complete_reason}
    </AlertDescription>
  </Alert>
)}
```

---

## Summary of Analytics Impact

### Metrics That Automatically Exclude Unverified Jobs:
✅ `jobs_completed` — Count of verified completions
✅ `on_time_completion_rate` — Only verified jobs
✅ `proof_completion_rate` — Only verified jobs
✅ `avg_job_duration_hours` — Only verified jobs
✅ `issues_detected` — Only verified jobs
✅ `issue_rate` — Only verified jobs
✅ Cleaner performance rankings — Only verified jobs
✅ Location performance rankings — Only verified jobs

### New Transparency Endpoint (Optional):
🆕 `/api/manager/analytics/unverified-completions/` — Track force-completed jobs separately

### Zero Code Changes Required in Current Analytics:
The exact match filter `status=Job.STATUS_COMPLETED` already excludes all other statuses, including the new `completed_unverified`.

**Result:** KPIs remain clean and unbiased. Unverified completions are tracked separately for audit purposes.
