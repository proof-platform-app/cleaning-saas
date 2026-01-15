# backend/apps/api/pdf.py
from io import BytesIO
from typing import Optional

from django.utils import timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

from apps.jobs.models import Job


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


def generate_job_report_pdf(job: Job) -> bytes:
    """
    Генерит PDF отчёт по Job и возвращает bytes.
    MVP: без карт и без фото (пока).
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

    doc.build(story)
    return buf.getvalue()
