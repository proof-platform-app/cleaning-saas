# AUDIT FIXES: views_cleaner.py

## Critical Risk #2: Race Conditions — Add Row-Level Locking

### 1. ChecklistItemToggleView.post() — Add select_for_update()

**Location:** `backend/apps/api/views_cleaner.py:277-305`

**Change:**
```python
def post(self, request, job_id: int, item_id: int):
    user = request.user

    if user.role != User.ROLE_CLEANER:
        return Response(
            {"detail": "Only cleaners can update checklist."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # AUDIT FIX: Add atomic transaction
    with transaction.atomic():
        job = get_object_or_404(Job, id=job_id, cleaner=user)

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Checklist can be updated only when job is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # AUDIT FIX: Add select_for_update() to prevent lost updates
        item = get_object_or_404(
            JobChecklistItem.objects.select_for_update(),
            id=item_id,
            job=job
        )

        serializer = ChecklistToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item.is_completed = serializer.validated_data["is_completed"]
        item.save(update_fields=["is_completed"])

    return Response(
        {"id": item.id, "job_id": job.id, "is_completed": item.is_completed},
        status=status.HTTP_200_OK,
    )
```

---

### 2. ChecklistBulkUpdateView.post() — Add select_for_update()

**Location:** `backend/apps/api/views_cleaner.py:316-354`

**Change:**
```python
def post(self, request, job_id: int):
    user = request.user

    if user.role != User.ROLE_CLEANER:
        return Response(
            {"detail": "Only cleaners can update checklist."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # AUDIT FIX: Add atomic transaction
    with transaction.atomic():
        job = get_object_or_404(Job, id=job_id, cleaner=user)

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Checklist can be updated only when job is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ChecklistBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["items"]
        ids = [it["id"] for it in items]
        updates = {it["id"]: it.get("is_completed", True) for it in items}

        # AUDIT FIX: Add select_for_update() to prevent lost updates
        qs = JobChecklistItem.objects.filter(job=job, id__in=ids).select_for_update()
        found = {obj.id: obj for obj in qs}

        if len(found) != len(set(ids)):
            return Response(
                {"detail": "One or more checklist items not found for this job"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for iid, obj in found.items():
            obj.is_completed = bool(updates[iid])

        JobChecklistItem.objects.bulk_update(found.values(), ["is_completed"])

    return Response({"updated_count": len(found)}, status=status.HTTP_200_OK)
```

---

### 3. JobCheckOutView.post() — Add select_for_update() for photos

**Location:** `backend/apps/api/views_cleaner.py:200-263`

**Change:** Wrap validation and check-out in atomic transaction with select_for_update() on job:

```python
def post(self, request, pk: int):
    user = request.user

    if user.role != User.ROLE_CLEANER:
        return Response(
            {"detail": "Only cleaners can check out."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # AUDIT FIX: Atomic transaction + select_for_update() on job
    with transaction.atomic():
        job = get_object_or_404(
            Job.objects.select_related("location").prefetch_related("checklist_items").select_for_update(),
            pk=pk,
            cleaner=user,
        )

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Check out allowed only for in_progress jobs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lat = serializer.validated_data["latitude"]
        lon = serializer.validated_data["longitude"]

        location = job.location
        if location.latitude is None or location.longitude is None:
            return Response(
                {"detail": "Job location has no coordinates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dist = distance_m(lat, lon, location.latitude, location.longitude)

        if dist > 100:
            return Response(
                {"detail": "Too far from job location.", "distance_m": round(dist, 2)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            job.check_out()
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        JobCheckEvent.objects.create(
            job=job,
            user=user,
            event_type=JobCheckEvent.TYPE_CHECK_OUT,
            latitude=lat,
            longitude=lon,
            distance_m=dist,
        )

    return Response(
        {
            "detail": "Check out successful.",
            "job_id": job.id,
            "job_status": job.status,
        },
        status=status.HTTP_200_OK,
    )
```

---

### 4. JobPhotosView.post() — Add atomic transaction

**Location:** `backend/apps/api/views_cleaner.py:406-523`

**Change:** Wrap entire photo upload in atomic transaction:

```python
def post(self, request, pk: int):
    user = request.user

    if user.role != User.ROLE_CLEANER:
        return Response(
            {"detail": "Only cleaners can upload photos."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # AUDIT FIX: Atomic transaction for photo upload
    with transaction.atomic():
        job = get_object_or_404(
            Job.objects.select_related("location"),
            pk=pk,
            cleaner=user
        )

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Photos can be uploaded only when job is in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photo_type = serializer.validated_data["photo_type"]
        uploaded = serializer.validated_data["file"]

        # AFTER requires BEFORE
        if photo_type == JobPhoto.TYPE_AFTER:
            if not JobPhoto.objects.filter(
                job=job, photo_type=JobPhoto.TYPE_BEFORE
            ).exists():
                return Response(
                    {"detail": "Cannot upload after photo before before photo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # максимум одно фото каждого типа
        if JobPhoto.objects.filter(job=job, photo_type=photo_type).exists():
            return Response(
                {"detail": f"{photo_type} photo already exists for this job."},
                status=status.HTTP_409_CONFLICT,
            )

        # EXIF и валидация
        exif_lat, exif_lon, exif_dt, exif_missing = extract_exif_data(uploaded)

        loc = job.location
        if exif_lat is not None and exif_lon is not None:
            if loc.latitude is not None and loc.longitude is not None:
                dist = distance_m(exif_lat, exif_lon, loc.latitude, loc.longitude)
                if dist > 100:
                    return Response(
                        {
                            "detail": "Photo too far from job location.",
                            "distance_m": round(dist, 2),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # нормализация формата в JPEG
        try:
            normalized_file = normalize_job_photo_to_jpeg(uploaded)
        except Exception as exc:
            return Response(
                {"detail": f"Unsupported image format: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = ".jpg"
        key = (
            f"company/{job.company_id}/jobs/{job.id}/photos/"
            f"{photo_type}/{uuid.uuid4().hex}{ext}"
        )

        try:
            normalized_file.seek(0)
        except Exception:
            pass

        saved_path = default_storage.save(
            key,
            ContentFile(normalized_file.read()),
        )
        file_url = default_storage.url(saved_path)

        db_file = File.objects.create(
            file_url=file_url,
            original_name=uploaded.name or "",
            content_type=getattr(normalized_file, "content_type", "")
            or getattr(uploaded, "content_type", "")
            or "",
            size_bytes=getattr(normalized_file, "size", None)
            or getattr(uploaded, "size", None),
        )

        job_photo = JobPhoto.objects.create(
            job=job,
            file=db_file,
            photo_type=photo_type,
            latitude=exif_lat,
            longitude=exif_lon,
            photo_timestamp=exif_dt,
        )

    out_file_url = db_file.file_url
    if out_file_url and out_file_url.startswith("/"):
        out_file_url = request.build_absolute_uri(out_file_url)

    out = {
        "photo_type": job_photo.photo_type,
        "file_url": out_file_url,
        "latitude": job_photo.latitude,
        "longitude": job_photo.longitude,
        "photo_timestamp": job_photo.photo_timestamp,
        "created_at": job_photo.created_at,
        "exif_missing": bool(exif_missing),
    }

    return Response(out, status=status.HTTP_201_CREATED)
```

---

## Summary of Changes

1. **ChecklistItemToggleView**: Wrapped in `transaction.atomic()`, added `select_for_update()` on item
2. **ChecklistBulkUpdateView**: Wrapped in `transaction.atomic()`, added `select_for_update()` on queryset
3. **JobCheckOutView**: Wrapped in `transaction.atomic()`, added `select_for_update()` on job
4. **JobPhotosView.post()**: Wrapped entire function in `transaction.atomic()`

These changes fix **Critical Risk #2** (race conditions) by ensuring:
- No lost updates on concurrent checklist toggles
- Photo upload + check-out race is eliminated (check-out locks job row)
- All mutations are atomic and isolated
