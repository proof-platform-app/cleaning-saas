# backend/apps/api/pdf.py
import os
from io import BytesIO
from typing import Optional

from django.conf import settings
from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
)

from apps.jobs.models import Job, JobPhoto


def _fmt_dt(value) -> str:
    if not value:
        return "—"
    try:
        local = timezone.localtime(value)
        return local.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(value)


def _fmt_time(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%H:%M")
    except Exception:
        return str(value)


def _fmt_date(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%Y-%m-%d")
    except Exception:
        return str(value)


def _fmt_float(value: Optional[float]) -> str:
    if value is None:
        return "—"
    try:
        return f"{float(value):.6f}"
    except Exception:
        return str(value)


def _resolve_media_path(file_url: str) -> Optional[str]:
    """
    MVP/DEV: превращаем /media/... в абсолютный путь на диске.
    Важно: не качаем http(s) URL, работаем с локальным storage.
    """
    if not file_url:
        return None

    media_url = getattr(settings, "MEDIA_URL", "/media/") or "/media/"
    media_root = getattr(settings, "MEDIA_ROOT", None)

    if not media_root:
        return None

    if file_url.startswith(media_url):
        rel = file_url[len(media_url) :].lstrip("/")
        return os.path.join(str(media_root), rel)

    return None


def _shorten(text: str, max_len: int = 90) -> str:
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _build_photo_cell(photo: Optional[JobPhoto], label: str, styles, max_w, max_h):
    """
    Содержимое ячейки:
      - заголовок (Before/After)
      - картинка (если есть) или fallback
      - метаданные (EXIF) если есть
    """
    meta_style = ParagraphStyle(
        name="PhotoMeta",
        parent=styles["BodyText"],
        fontSize=8,
        leading=10,
        textColor=colors.grey,
    )

    flows = [Paragraph(f"<b>{label}</b>", styles["Heading3"]), Spacer(1, 2 * mm)]

    if not photo or not getattr(photo, "file", None) or not getattr(photo.file, "file_url", ""):
        flows.append(Paragraph("— Not provided", styles["BodyText"]))
        return flows

    file_url = photo.file.file_url
    abs_path = _resolve_media_path(file_url)

    if not abs_path or not os.path.exists(abs_path):
        flows.append(Paragraph("— Not provided", styles["BodyText"]))
        flows.append(Spacer(1, 1 * mm))
        flows.append(Paragraph(f"file_url: {_shorten(file_url)}", meta_style))
        return flows

    # Рендер картинки (бережно, без падений)
    try:
        reader = ImageReader(abs_path)
        iw, ih = reader.getSize()

        # масштабирование с сохранением пропорций
        scale = min(max_w / float(iw), max_h / float(ih))
        draw_w = float(iw) * scale
        draw_h = float(ih) * scale

        img = RLImage(abs_path, width=draw_w, height=draw_h)
        flows.append(img)

    except Exception:
        flows.append(Paragraph("— Cannot render image", styles["BodyText"]))
        flows.append(Spacer(1, 1 * mm))
        flows.append(Paragraph(f"file_url: {_shorten(file_url)}", meta_style))
        return flows

    # EXIF/metadata (если есть)
    meta_bits = []

    if getattr(photo, "photo_timestamp", None):
        meta_bits.append(f"Taken: {_fmt_dt(photo.photo_timestamp)}")

    lat = getattr(photo, "latitude", None)
    lon = getattr(photo, "longitude", None)
    if lat is not None and lon is not None:
        meta_bits.append(f"GPS: {_fmt_float(lat)}, {_fmt_float(lon)}")

    if meta_bits:
        flows.append(Spacer(1, 2 * mm))
        flows.append(Paragraph(" | ".join(meta_bits), meta_style))

    return flows


def _draw_footer(canvas, doc, job_id: int):
    """
    Футер на каждой странице: generated at + job id + page number.
    """
    canvas.saveState()
    font_name = "Helvetica"
    font_size = 8
    canvas.setFont(font_name, font_size)
    canvas.setFillColor(colors.grey)

    generated_at = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M:%S")
    left_text = f"Generated at {generated_at} | Job #{job_id}"
    right_text = f"Page {doc.page}"

    y = 10 * mm
    x_left = doc.leftMargin
    x_right = doc.pagesize[0] - doc.rightMargin

    canvas.drawString(x_left, y, left_text)

    rt_w = stringWidth(right_text, font_name, font_size)
    canvas.drawString(x_right - rt_w, y, right_text)

    canvas.restoreState()


def generate_job_report_pdf(job: Job) -> bytes:
    """
    Генерит PDF отчёт по Job и возвращает bytes.
    """
    buf = BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Job Report #{job.id}",
        author="Cleaning SaaS",
    )

    styles = getSampleStyleSheet()
    story = []

    # Header
    story.append(Paragraph(f"<b>Job Report</b> — #{job.id}", styles["Title"]))
    story.append(Spacer(1, 6 * mm))

    # Summary table
    location = getattr(job, "location", None)
    cleaner = getattr(job, "cleaner", None)

    summary_data = [
        ["Status", job.status],
        ["Scheduled Date", _fmt_date(job.scheduled_date)],
        ["Scheduled Time", f"{_fmt_time(job.scheduled_start_time)} – {_fmt_time(job.scheduled_end_time)}"],
        ["Actual Start", _fmt_dt(job.actual_start_time)],
        ["Actual End", _fmt_dt(job.actual_end_time)],
        ["Location", getattr(location, "name", "—")],
        ["Address", getattr(location, "address", "—")],
        ["Location Coordinates", f"{_fmt_float(getattr(location, 'latitude', None))}, {_fmt_float(getattr(location, 'longitude', None))}"],
        ["Cleaner", getattr(cleaner, "full_name", "—")],
        ["Cleaner Phone", getattr(cleaner, "phone", "—")],
    ]

    tbl = Table(summary_data, colWidths=[45 * mm, 120 * mm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(tbl)
    story.append(Spacer(1, 8 * mm))

    # Notes
    story.append(Paragraph("<b>Manager Notes</b>", styles["Heading3"]))
    story.append(Paragraph((job.manager_notes or "—").replace("\n", "<br/>"), styles["BodyText"]))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("<b>Cleaner Notes</b>", styles["Heading3"]))
    story.append(Paragraph((job.cleaner_notes or "—").replace("\n", "<br/>"), styles["BodyText"]))
    story.append(Spacer(1, 8 * mm))

    # Photos (KeepTogether, чтобы не разваливалось)
    photos = list(job.photos.select_related("file").all())
    by_type = {p.photo_type: p for p in photos if getattr(p, "photo_type", None)}

    before = by_type.get(JobPhoto.TYPE_BEFORE)
    after = by_type.get(JobPhoto.TYPE_AFTER)

    cell_w = (doc.width - 8 * mm) / 2.0
    img_max_w = cell_w
    img_max_h = 65 * mm  # чуть меньше, чтобы реже улетало на следующую страницу

    left_cell = _build_photo_cell(before, "Before", styles, img_max_w, img_max_h)
    right_cell = _build_photo_cell(after, "After", styles, img_max_w, img_max_h)

    photos_tbl = Table([[left_cell, right_cell]], colWidths=[cell_w, cell_w])
    photos_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    story.append(
        KeepTogether(
            [
                Paragraph("<b>Photos</b>", styles["Heading2"]),
                Spacer(1, 2 * mm),
                photos_tbl,
                Spacer(1, 8 * mm),
            ]
        )
    )

    # Checklist
    story.append(Paragraph("<b>Checklist</b>", styles["Heading2"]))
    items = list(job.checklist_items.all().order_by("order", "id"))
    if not items:
        story.append(Paragraph("— No checklist items", styles["BodyText"]))
    else:
        checklist_rows = [["#", "Item", "Required", "Completed"]]
        for it in items:
            checklist_rows.append(
                [
                    str(it.order),
                    it.text,
                    "Yes" if it.is_required else "No",
                    "Yes" if it.is_completed else "No",
                ]
            )

        ct = Table(checklist_rows, colWidths=[12 * mm, 105 * mm, 25 * mm, 25 * mm])
        ct.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3B7A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(ct)

    story.append(Spacer(1, 8 * mm))

    # Events
    story.append(Paragraph("<b>Audit Events</b>", styles["Heading2"]))
    events = list(job.check_events.all().order_by("created_at"))
    if not events:
        story.append(Paragraph("— No events", styles["BodyText"]))
    else:
        ev_rows = [["Type", "Time", "Lat", "Lon", "Distance (m)", "User"]]
        for ev in events:
            ev_rows.append(
                [
                    ev.event_type,
                    _fmt_dt(ev.created_at),
                    _fmt_float(ev.latitude),
                    _fmt_float(ev.longitude),
                    ("—" if ev.distance_m is None else f"{ev.distance_m:.2f}"),
                    getattr(getattr(ev, "user", None), "full_name", "—"),
                ]
            )

        et = Table(ev_rows, colWidths=[26 * mm, 45 * mm, 25 * mm, 25 * mm, 25 * mm, 34 * mm])
        et.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(et)

    def _on_page(canvas, doc_):
        _draw_footer(canvas, doc_, job.id)

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue()
