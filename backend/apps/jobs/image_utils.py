from __future__ import annotations

import os
import subprocess
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile


HEIC_CONTENT_TYPES = {
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
}
HEIC_EXTENSIONS = {".heic", ".heif"}


def _is_heic(uploaded_file) -> bool:
    """
    Определяем, HEIC/HEIF ли это, по content_type и расширению.
    """
    if uploaded_file is None:
        return False

    name_lower = (uploaded_file.name or "").lower()
    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()

    return (
        content_type in HEIC_CONTENT_TYPES
        or any(name_lower.endswith(ext) for ext in HEIC_EXTENSIONS)
    )


def _read_all_bytes(uploaded_file) -> bytes:
    """
    Надёжно читаем все байты из UploadedFile.
    """
    if hasattr(uploaded_file, "chunks"):
        # для InMemoryUploadedFile / TemporaryUploadedFile
        chunks = []
        for chunk in uploaded_file.chunks():
            chunks.append(chunk)
        return b"".join(chunks)
    return uploaded_file.read()


def normalize_job_photo_to_jpeg(uploaded_file):
    """
    Принимает uploaded_file (любой формат).
    Если HEIC/HEIF — конвертирует в JPEG через системный `sips`.
    Иначе возвращает файл как есть.

    Возвращает объект UploadedFile, который можно передавать в FileField.
    """
    if uploaded_file is None:
        return uploaded_file

    if not _is_heic(uploaded_file):
        # не HEIC — отдаем как есть
        return uploaded_file

    # читаем байты исходного файла
    raw_bytes = _read_all_bytes(uploaded_file)

    src_path = None
    dst_path = None

    try:
        # временный HEIC-файл
        src_fd, src_path = tempfile.mkstemp(suffix=".heic")
        with os.fdopen(src_fd, "wb") as src_f:
            src_f.write(raw_bytes)

        # путь для JPEG
        base, _ = os.path.splitext(src_path)
        dst_path = base + ".jpg"

        # конвертация через sips
        # sips -s format jpeg src.heic --out dst.jpg
        proc = subprocess.run(
            ["sips", "-s", "format", "jpeg", src_path, "--out", dst_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        if proc.returncode != 0:
            raise RuntimeError(
                f"sips failed with code {proc.returncode}: {proc.stderr.decode('utf-8', errors='ignore')}"
            )

        # читаем JPEG из dst_path
        with open(dst_path, "rb") as dst_f:
            jpg_bytes = dst_f.read()

        buffer = BytesIO(jpg_bytes)
        buffer.seek(0)

        # собираем нормальный UploadedFile
        orig_name = uploaded_file.name or "photo.heic"
        base_name, _ = os.path.splitext(orig_name)
        new_name = base_name + ".jpg"

        converted = InMemoryUploadedFile(
            file=buffer,
            field_name=getattr(uploaded_file, "field_name", "file"),
            name=new_name,
            content_type="image/jpeg",
            size=len(jpg_bytes),
            charset=None,
        )
        return converted

    finally:
        # чистим за собой временные файлы
        if src_path and os.path.exists(src_path):
            try:
                os.remove(src_path)
            except Exception:
                pass
        if dst_path and os.path.exists(dst_path):
            try:
                os.remove(dst_path)
            except Exception:
                pass


def convert_to_jpeg_if_needed(uploaded_file):
    """
    Старое имя для совместимости. Просто обёртка над normalize_job_photo_to_jpeg.
    """
    return normalize_job_photo_to_jpeg(uploaded_file)
