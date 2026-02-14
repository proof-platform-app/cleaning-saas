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
  Image,
  KeepTogether,
)

from apps.jobs.models import Job, JobPhoto
from apps.api.serializers import (
    compute_sla_status_for_job,
    compute_sla_reasons_for_job,
)


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


# Human-readable labels for SLA reason codes
SLA_REASON_LABELS = {
    "checklist_not_completed": "Checklist not completed",
    "no_before_photo": "Before photo missing",
    "no_after_photo": "After photo missing",
    "no_check_in": "Check-in missing",
    "no_check_out": "Check-out missing",
    "check_in_too_far": "Check-in location too far",
    "check_out_too_far": "Check-out location too far",
    "late_start": "Late start",
    "early_end": "Early end",
    "no_photos": "No photos provided",
    "missing_proof": "Missing proof",
}


def _get_reason_label(code: str) -> str:
    """Convert SLA reason code to human-readable label."""
    return SLA_REASON_LABELS.get(code, code.replace("_", " ").capitalize())


# Job status colors and labels
JOB_STATUS_STYLES = {
    "completed": {"label": "Completed", "bg": "#22c55e", "text": "#ffffff"},
    "in_progress": {"label": "In Progress", "bg": "#3b82f6", "text": "#ffffff"},
    "scheduled": {"label": "Scheduled", "bg": "#f59e0b", "text": "#ffffff"},
    "cancelled": {"label": "Cancelled", "bg": "#6b7280", "text": "#ffffff"},
    "pending": {"label": "Pending", "bg": "#8b5cf6", "text": "#ffffff"},
}


# Audit event type labels
EVENT_TYPE_LABELS = {
    "check_in": "Check In",
    "check_out": "Check Out",
    "photo_upload": "Photo Upload",
    "checklist_update": "Checklist Update",
    "note_added": "Note Added",
}


def _get_event_type_label(event_type: str) -> str:
    """Convert event type code to human-readable label."""
    return EVENT_TYPE_LABELS.get(event_type, event_type.replace("_", " ").title())


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
      rel = file_url[len(media_url):].lstrip("/")
      return os.path.join(str(media_root), rel)

  return None


def _shorten(text: str, max_len: int = 90) -> str:
  if not text:
      return ""
  if len(text) <= max_len:
      return text
  return text[: max_len - 3] + "..."


def _get_company_logo_image(company, max_height=18 * mm):
  """
  Пытается достать логотип компании и вернуть ReportLab Image.
  Поддерживает несколько возможных имён полей: logo, logo_file, logo_image.
  Если файла нет или он недоступен — возвращает None.
  """
  logo_field = None

  for attr in ("logo", "logo_file", "logo_image"):
      value = getattr(company, attr, None)
      if value:
          logo_field = value
          break

  if not logo_field:
      return None

  try:
      logo_path = logo_field.path
  except (AttributeError, ValueError):
      return None

  if not logo_path or not os.path.exists(logo_path):
      return None

  from reportlab.lib.utils import ImageReader
  reader = ImageReader(logo_path)
  iw, ih = reader.getSize()
  # Scale proportionally to fit max_height
  scale = max_height / float(ih) if ih else 1
  img = Image(logo_path, width=float(iw) * scale, height=max_height)
  img.hAlign = "LEFT"
  return img


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

      img = Image(abs_path, width=draw_w, height=draw_h)
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


def _draw_company_report_footer(canvas, doc, company_name: str):
  """
  Footer for company SLA reports: generated at + company name + page number.
  """
  canvas.saveState()
  font_name = "Helvetica"
  font_size = 8
  canvas.setFont(font_name, font_size)
  canvas.setFillColor(colors.grey)

  generated_at = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M:%S")
  left_text = f"Generated: {generated_at} | {company_name}"
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

  # Get company for logo
  location = getattr(job, "location", None)
  company = getattr(location, "company", None) if location else None
  cleaner = getattr(job, "cleaner", None)

  # Header with optional company logo
  title_style = ParagraphStyle(
      name="JobTitle",
      parent=styles["Title"],
      fontSize=18,
      leading=22,
      spaceAfter=2,
  )

  subtitle_style = ParagraphStyle(
      name="JobSubtitle",
      parent=styles["Normal"],
      fontSize=9,
      textColor=colors.grey,
  )

  title_para = Paragraph(f"<b>Job Report</b> — #{job.id}", title_style)
  company_name = getattr(company, "name", "CleanProof") if company else "CleanProof"
  subtitle_para = Paragraph(f"Generated by {company_name}", subtitle_style)

  logo_img = _get_company_logo_image(company, max_height=16 * mm) if company else None

  if logo_img:
      header_table = Table(
          [[logo_img, [title_para, subtitle_para]]],
          colWidths=[28 * mm, doc.width - 28 * mm],
          hAlign="LEFT",
      )
      header_table.setStyle(
          TableStyle(
              [
                  ("VALIGN", (0, 0), (-1, -1), "TOP"),
                  ("LEFTPADDING", (0, 0), (-1, -1), 0),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                  ("TOPPADDING", (0, 0), (-1, -1), 0),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
              ]
          )
      )
      story.append(header_table)
  else:
      story.append(title_para)
      story.append(subtitle_para)

  story.append(Spacer(1, 6 * mm))

  # Status badge style
  status_info = JOB_STATUS_STYLES.get(job.status, {"label": job.status.title(), "bg": "#6b7280", "text": "#ffffff"})
  status_badge_style = ParagraphStyle(
      name="StatusBadge",
      parent=styles["Normal"],
      fontSize=9,
      fontName="Helvetica-Bold",
      textColor=colors.HexColor(status_info["text"]),
      backColor=colors.HexColor(status_info["bg"]),
      borderPadding=(4, 8, 4, 8),
      alignment=0,
  )

  # Summary table with styled status
  summary_data = [
      ["Status", Paragraph(f"<b>{status_info['label']}</b>", status_badge_style)],
      ["Scheduled Date", _fmt_date(job.scheduled_date)],
      [
          "Scheduled Time",
          f"{_fmt_time(job.scheduled_start_time)} – {_fmt_time(job.scheduled_end_time)}",
      ],
      ["Actual Start", _fmt_dt(job.actual_start_time)],
      ["Actual End", _fmt_dt(job.actual_end_time)],
      ["Location", getattr(location, "name", "—")],
      ["Address", getattr(location, "address", "—")],
      [
          "Location Coordinates",
          f"{_fmt_float(getattr(location, 'latitude', None))}, {_fmt_float(getattr(location, 'longitude', None))}",
      ],
      ["Cleaner", getattr(cleaner, "full_name", "—")],
      ["Cleaner Phone", getattr(cleaner, "phone", "—")],
  ]

  tbl = Table(summary_data, colWidths=[45 * mm, 120 * mm])
  tbl.setStyle(
      TableStyle(
          [
              ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1e40af")),  # Blue labels
              ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
              ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
              ("BACKGROUND", (1, 0), (1, -1), colors.white),  # White values
              ("TEXTCOLOR", (1, 0), (1, -1), colors.black),
              ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
              ("FONTSIZE", (0, 0), (-1, -1), 10),
              ("ALIGN", (0, 0), (0, -1), "LEFT"),
              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
              ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#1e40af")),
              ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
              ("TOPPADDING", (0, 0), (-1, -1), 8),
              ("LEFTPADDING", (0, 0), (-1, -1), 8),
              ("RIGHTPADDING", (0, 0), (-1, -1), 8),
          ]
      )
  )
  story.append(tbl)
  story.append(Spacer(1, 8 * mm))

  # Notes with styled background
  notes_style = ParagraphStyle(
      name="NotesText",
      parent=styles["BodyText"],
      fontSize=10,
      leading=14,
      leftIndent=8,
      rightIndent=8,
      spaceBefore=4,
      spaceAfter=4,
  )

  section_header_style = ParagraphStyle(
      name="SectionHeader",
      parent=styles["Heading3"],
      fontSize=11,
      fontName="Helvetica-Bold",
      textColor=colors.HexColor("#1e293b"),
      spaceBefore=0,
      spaceAfter=4,
  )

  # Manager Notes
  story.append(Paragraph("Manager Notes", section_header_style))
  manager_notes_content = (job.manager_notes or "—").replace("\n", "<br/>")
  manager_notes_table = Table(
      [[Paragraph(manager_notes_content, notes_style)]],
      colWidths=[doc.width],
  )
  manager_notes_table.setStyle(
      TableStyle(
          [
              ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
              ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
              ("TOPPADDING", (0, 0), (-1, -1), 8),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
              ("LEFTPADDING", (0, 0), (-1, -1), 10),
              ("RIGHTPADDING", (0, 0), (-1, -1), 10),
          ]
      )
  )
  story.append(manager_notes_table)
  story.append(Spacer(1, 4 * mm))

  # Cleaner Notes
  story.append(Paragraph("Cleaner Notes", section_header_style))
  cleaner_notes_content = (job.cleaner_notes or "—").replace("\n", "<br/>")
  cleaner_notes_table = Table(
      [[Paragraph(cleaner_notes_content, notes_style)]],
      colWidths=[doc.width],
  )
  cleaner_notes_table.setStyle(
      TableStyle(
          [
              ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),  # Light yellow
              ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#fde68a")),
              ("TOPPADDING", (0, 0), (-1, -1), 8),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
              ("LEFTPADDING", (0, 0), (-1, -1), 10),
              ("RIGHTPADDING", (0, 0), (-1, -1), 10),
          ]
      )
  )
  story.append(cleaner_notes_table)
  story.append(Spacer(1, 8 * mm))

  # ----------------------------------------------------
  # SLA & Proof - with colored status block
  # ----------------------------------------------------
  sla_status = compute_sla_status_for_job(job)
  sla_reasons = compute_sla_reasons_for_job(job) or []

  story.append(Paragraph("SLA & Proof", section_header_style))
  story.append(Spacer(1, 2 * mm))

  if sla_status == "ok":
      # Green SLA OK block
      sla_ok_style = ParagraphStyle(
          name="SLAOK",
          parent=styles["BodyText"],
          fontSize=11,
          fontName="Helvetica-Bold",
          textColor=colors.HexColor("#166534"),
      )
      sla_ok_desc_style = ParagraphStyle(
          name="SLAOKDesc",
          parent=styles["BodyText"],
          fontSize=9,
          textColor=colors.HexColor("#166534"),
      )
      sla_content = [
          [
              Paragraph("✓ SLA OK", sla_ok_style),
          ],
          [
              Paragraph(
                  "All required proof (check-in/out, photos, checklist) looks good for this job.",
                  sla_ok_desc_style,
              ),
          ],
      ]
      sla_table = Table(sla_content, colWidths=[doc.width])
      sla_table.setStyle(
          TableStyle(
              [
                  ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#dcfce7")),  # Light green
                  ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#22c55e")),
                  ("TOPPADDING", (0, 0), (-1, -1), 8),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                  ("LEFTPADDING", (0, 0), (-1, -1), 12),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 12),
              ]
          )
      )
      story.append(sla_table)
  else:
      # Red SLA Violated block
      sla_violated_style = ParagraphStyle(
          name="SLAViolated",
          parent=styles["BodyText"],
          fontSize=11,
          fontName="Helvetica-Bold",
          textColor=colors.HexColor("#991b1b"),
      )
      sla_reason_style = ParagraphStyle(
          name="SLAReason",
          parent=styles["BodyText"],
          fontSize=9,
          textColor=colors.HexColor("#991b1b"),
          leftIndent=12,
      )

      sla_content = [[Paragraph("✗ SLA Violated", sla_violated_style)]]

      if sla_reasons:
          reasons_text = "<br/>".join([f"• {_get_reason_label(r)}" for r in sla_reasons])
          sla_content.append([Paragraph(reasons_text, sla_reason_style)])

      sla_table = Table(sla_content, colWidths=[doc.width])
      sla_table.setStyle(
          TableStyle(
              [
                  ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef2f2")),  # Light red
                  ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#ef4444")),
                  ("TOPPADDING", (0, 0), (-1, -1), 8),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                  ("LEFTPADDING", (0, 0), (-1, -1), 12),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 12),
              ]
          )
      )
      story.append(sla_table)

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
      ev_rows = [["Event", "Time", "Lat", "Lon", "Distance (m)", "User"]]
      for ev in events:
          ev_rows.append(
              [
                  _get_event_type_label(ev.event_type),  # Human-readable label
                  _fmt_dt(ev.created_at),
                  _fmt_float(ev.latitude),
                  _fmt_float(ev.longitude),
                  ("—" if ev.distance_m is None else f"{ev.distance_m:.2f}"),
                  getattr(getattr(ev, "user", None), "full_name", "—"),
              ]
          )

      et = Table(
          ev_rows,
          colWidths=[28 * mm, 45 * mm, 24 * mm, 24 * mm, 24 * mm, 35 * mm],
      )
      et.setStyle(
          TableStyle(
              [
                  ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),  # Slate header
                  ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                  ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                  ("FONTSIZE", (0, 0), (-1, 0), 9),
                  ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#475569")),
                  ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                  ("FONTSIZE", (0, 1), (-1, -1), 8),
                  ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                  ("ALIGN", (2, 0), (-2, -1), "CENTER"),  # Center lat/lon/distance
                  ("TOPPADDING", (0, 0), (-1, -1), 6),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                  ("LEFTPADDING", (0, 0), (-1, -1), 6),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                  # Alternating row colors
                  ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
              ]
          )
      )
      story.append(et)

  def _on_page(canvas, doc_):
      _draw_footer(canvas, doc_, job.id)

  doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
  return buf.getvalue()


def generate_company_sla_report_pdf(company, report_data: dict) -> bytes:
  """
  PDF-отчёт по SLA для компании.
  Использует агрегированные данные из _get_company_report.
  """
  buffer = BytesIO()

  doc = SimpleDocTemplate(
      buffer,
      pagesize=A4,
      leftMargin=20 * mm,
      rightMargin=20 * mm,
      topMargin=20 * mm,
      bottomMargin=20 * mm,
  )

  styles = getSampleStyleSheet()

  # Базовые стили
  title_style = ParagraphStyle(
      name="TitleMain",
      parent=styles["Heading1"],
      fontSize=16,
      leading=20,
      spaceAfter=2,
  )

  subtitle_style = ParagraphStyle(
      name="Subtitle",
      parent=styles["Normal"],
      fontSize=9,
      leading=11,
      textColor=colors.grey,
      spaceAfter=2,
  )

  small_style = ParagraphStyle(
      name="Small",
      parent=styles["Normal"],
      fontSize=9,
      leading=11,
  )

  section_title_style = ParagraphStyle(
      name="SectionTitle",
      parent=styles["Heading3"],
      fontSize=12,
      leading=16,
      spaceBefore=16,
      spaceAfter=6,
      textColor=colors.HexColor("#1e293b"),
      fontName="Helvetica-Bold",
  )

  story = []

  period_from = report_data["period"]["from"]
  period_to = report_data["period"]["to"]
  summary = report_data["summary"]
  cleaners = report_data.get("cleaners", [])
  locations = report_data.get("locations", [])
  top_reasons = report_data.get("top_reasons", [])

  # --- Header with optional company logo ---
  title_para = Paragraph(
      f"{company.name} — SLA Performance Report",
      title_style,
  )
  subtitle_para = Paragraph("Generated by CleanProof", subtitle_style)
  period_para = Paragraph(f"Period: {period_from} to {period_to}", small_style)

  header_paragraphs = [title_para, subtitle_para, period_para]

  logo_img = _get_company_logo_image(company, max_height=18 * mm)

  if logo_img:
      header_table = Table(
          [[logo_img, header_paragraphs]],
          colWidths=[30 * mm, doc.width - 30 * mm],
          hAlign="LEFT",
      )
      header_table.setStyle(
          TableStyle(
              [
                  ("VALIGN", (0, 0), (-1, -1), "TOP"),
                  ("LEFTPADDING", (0, 0), (-1, -1), 0),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                  ("TOPPADDING", (0, 0), (-1, -1), 0),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
              ]
          )
      )
      story.append(header_table)
      story.append(Spacer(1, 12))
  else:
      for p in header_paragraphs:
          story.append(p)
      story.append(Spacer(1, 12))

  # Тонкая разделительная линия
  line = Table(
      [[Paragraph("", small_style)]],
      colWidths=[doc.width],
      style=TableStyle(
          [
              ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.lightgrey),
              ("LEFTPADDING", (0, 0), (-1, -1), 0),
              ("RIGHTPADDING", (0, 0), (-1, -1), 0),
              ("TOPPADDING", (0, 0), (-1, -1), 0),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
          ]
      ),
  )
  story.append(line)
  story.append(Spacer(1, 10))

  # ----------------------------------------------------
  #  KPI Summary Cards
  # ----------------------------------------------------
  jobs_count = summary.get("jobs_count", 0) or 0
  violations_count = summary.get("violations_count", 0) or 0
  issue_rate = summary.get("issue_rate", 0.0) or 0.0
  success_rate = (1.0 - issue_rate) * 100

  # Card styles
  kpi_value_style = ParagraphStyle(
      name="KPIValue",
      parent=styles["Normal"],
      fontSize=20,
      leading=24,
      alignment=1,  # CENTER
      fontName="Helvetica-Bold",
  )

  kpi_label_style = ParagraphStyle(
      name="KPILabel",
      parent=styles["Normal"],
      fontSize=8,
      leading=10,
      alignment=1,  # CENTER
      textColor=colors.grey,
  )

  # Create KPI cards
  def _make_kpi_card(value: str, label: str, bg_color=colors.whitesmoke):
      return [
          Paragraph(value, kpi_value_style),
          Spacer(1, 2),
          Paragraph(label, kpi_label_style),
      ]

  # Determine success rate color
  if success_rate >= 90:
      success_color = colors.HexColor("#22c55e")  # Green
  elif success_rate >= 70:
      success_color = colors.HexColor("#f59e0b")  # Amber
  else:
      success_color = colors.HexColor("#ef4444")  # Red

  card_width = doc.width / 3 - 4 * mm

  kpi_data = [
      [
          _make_kpi_card(str(jobs_count), "Total Jobs"),
          _make_kpi_card(str(violations_count), "SLA Violations"),
          _make_kpi_card(f"{success_rate:.0f}%", "Success Rate"),
      ]
  ]

  kpi_table = Table(kpi_data, colWidths=[card_width, card_width, card_width])

  kpi_table.setStyle(
      TableStyle(
          [
              # Background for all cards
              ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f0f9ff")),  # Light blue
              ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#fef2f2")),  # Light red
              ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#f0fdf4")),  # Light green
              # Borders
              ("BOX", (0, 0), (0, 0), 1, colors.HexColor("#3b82f6")),  # Blue border
              ("BOX", (1, 0), (1, 0), 1, colors.HexColor("#ef4444")),  # Red border
              ("BOX", (2, 0), (2, 0), 1, success_color),  # Dynamic color border
              # Padding
              ("LEFTPADDING", (0, 0), (-1, -1), 8),
              ("RIGHTPADDING", (0, 0), (-1, -1), 8),
              ("TOPPADDING", (0, 0), (-1, -1), 12),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
              # Alignment
              ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ]
      )
  )

  story.append(kpi_table)
  story.append(Spacer(1, 16))

  # ----------------------------------------------------
  #  Краткий текстовый summary
  # ----------------------------------------------------

  # Proper grammar for singular/plural
  jobs_word = "job was" if jobs_count == 1 else "jobs were"
  violations_word = "violation was" if violations_count == 1 else "violations were"

  summary_text = (
      f"In this period, {jobs_count} {jobs_word} completed. "
      f"{violations_count} SLA {violations_word} detected ({issue_rate * 100:.1f}% issue rate)."
  )

  if top_reasons:
      # Use human-readable labels for reasons
      reason_labels = [_get_reason_label(r["code"]) for r in top_reasons if r.get("code")]
      if reason_labels:
          reason_names = ", ".join(reason_labels[:3])  # Top 3
          summary_text += f" Most common issues: {reason_names}."

  if locations:
      main_location = locations[0]
      loc_name = main_location.get("name") or ""
      if loc_name:
          summary_text += f" Issues occurred primarily at {loc_name}."

  story.append(Paragraph(summary_text, small_style))
  story.append(Spacer(1, 12))

  # ----------------------------------------------------
  #  Таблица: Cleaners with issues
  # ----------------------------------------------------
  story.append(Paragraph("Cleaners with issues", section_title_style))
  story.append(
      Paragraph(
          "Who generates the most SLA violations in this period.",
          small_style,
      )
  )
  story.append(Spacer(1, 4))

  cleaners_rows = [["Cleaner", "Jobs", "SLA violations"]]

  for c in cleaners:
      name = c.get("name") or "—"
      jc = c.get("jobs_count", 0) or 0
      vc = c.get("violations_count", 0) or 0
      if jc == 0 and vc == 0:
          continue
      cleaners_rows.append([name, jc, vc])

  cleaners_table = Table(
      cleaners_rows,
      colWidths=[doc.width * 0.6, doc.width * 0.15, doc.width * 0.25],
      hAlign="LEFT",
  )

  cleaners_table.setStyle(
      TableStyle(
          [
              ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),  # Blue header
              ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
              ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
              ("FONTSIZE", (0, 0), (-1, 0), 9),
              ("ALIGN", (1, 0), (-1, -1), "CENTER"),
              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
              ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
              ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#1e40af")),
              ("LEFTPADDING", (0, 0), (-1, -1), 8),
              ("RIGHTPADDING", (0, 0), (-1, -1), 8),
              ("TOPPADDING", (0, 0), (-1, -1), 6),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
              # Alternating row colors
              ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
          ]
      )
  )

  story.append(cleaners_table)
  story.append(Spacer(1, 12))

  # ----------------------------------------------------
  #  Таблица: Locations with issues
  # ----------------------------------------------------
  story.append(Paragraph("Locations with issues", section_title_style))
  story.append(
      Paragraph(
          "Where SLA problems appear most often in this period.",
          small_style,
      )
  )
  story.append(Spacer(1, 4))

  locations_rows = [["Location", "Jobs", "SLA violations"]]

  for loc in locations:
      name = loc.get("name") or "—"
      jc = loc.get("jobs_count", 0) or 0
      vc = loc.get("violations_count", 0) or 0
      if jc == 0 and vc == 0:
          continue
      locations_rows.append([name, jc, vc])

  locations_table = Table(
      locations_rows,
      colWidths=[doc.width * 0.6, doc.width * 0.15, doc.width * 0.25],
      hAlign="LEFT",
  )

  locations_table.setStyle(
      TableStyle(
          [
              ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),  # Blue header
              ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
              ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
              ("FONTSIZE", (0, 0), (-1, 0), 9),
              ("ALIGN", (1, 0), (-1, -1), "CENTER"),
              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
              ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
              ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#1e40af")),
              ("LEFTPADDING", (0, 0), (-1, -1), 8),
              ("RIGHTPADDING", (0, 0), (-1, -1), 8),
              ("TOPPADDING", (0, 0), (-1, -1), 6),
              ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
              # Alternating row colors
              ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
          ]
      )
  )

  story.append(locations_table)
  story.append(Spacer(1, 12))

  # ----------------------------------------------------
  #  Top SLA reasons
  # ----------------------------------------------------
  story.append(Paragraph("Top SLA reasons", section_title_style))
  story.append(
      Paragraph(
          "What causes SLA violations most frequently.",
          small_style,
      )
  )
  story.append(Spacer(1, 4))

  if top_reasons:
      reasons_rows = [["Reason", "Count"]]
      for r in top_reasons:
          code = r.get("code") or ""
          label = _get_reason_label(code) if code else "—"
          count = r.get("count", 0) or 0
          reasons_rows.append([label, count])

      reasons_table = Table(
          reasons_rows,
          colWidths=[doc.width * 0.7, doc.width * 0.3],
          hAlign="LEFT",
      )

      reasons_table.setStyle(
          TableStyle(
              [
                  ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dc2626")),  # Red header for violations
                  ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                  ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                  ("FONTSIZE", (0, 0), (-1, 0), 9),
                  ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                  ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                  ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                  ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#dc2626")),
                  ("LEFTPADDING", (0, 0), (-1, -1), 8),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                  ("TOPPADDING", (0, 0), (-1, -1), 6),
                  ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                  # Alternating row colors
                  ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef2f2")]),
              ]
          )
      )

      story.append(reasons_table)
  else:
      story.append(Paragraph("No SLA violations were detected in this period.", small_style))

  # Add footer to each page
  company_name = getattr(company, "name", "Company")

  def _on_page(canvas, doc_):
      _draw_company_report_footer(canvas, doc_, company_name)

  doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)

  pdf_bytes = buffer.getvalue()
  buffer.close()
  return pdf_bytes
