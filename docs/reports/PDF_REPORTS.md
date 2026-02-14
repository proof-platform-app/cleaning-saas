# PDF Reports Documentation

> Last updated: 2026-02-14

## Overview

The system generates two types of PDF reports:
1. **Job Report** — detailed report for a single job
2. **Company SLA Report** — aggregated SLA performance report for a company over a period

Both reports are generated using ReportLab library (`apps/api/pdf.py`).

---

## Job Report

### Endpoint
```
GET /api/manager/jobs/{job_id}/report/pdf/
```

### Features
- **Header** with company logo (if available) and job ID
- **Status badge** — color-coded job status:
  - Completed (green)
  - In Progress (blue)
  - Scheduled (amber)
  - Cancelled (gray)
  - Pending (purple)

- **Summary table** — blue header with job details:
  - Scheduled date/time
  - Actual start/end times
  - Location name, address, coordinates
  - Cleaner name and phone

- **Notes sections** with styled backgrounds:
  - Manager Notes (light gray background)
  - Cleaner Notes (light yellow background)

- **SLA & Proof block** — color-coded status:
  - Green block for "SLA OK"
  - Red block for "SLA Violated" with human-readable reasons

- **Photos** — Before/After photos side by side with EXIF metadata

- **Checklist** — table with blue header showing all checklist items

- **Audit Events** — table with slate header showing:
  - Event type (human-readable: "Check In", "Check Out")
  - Timestamp, GPS coordinates, distance, user

- **Footer** — generation timestamp, job ID, page number

### SLA Reason Labels
Technical codes are converted to human-readable labels:
| Code | Label |
|------|-------|
| `checklist_not_completed` | Checklist not completed |
| `no_before_photo` | Before photo missing |
| `no_after_photo` | After photo missing |
| `no_check_in` | Check-in missing |
| `no_check_out` | Check-out missing |
| `check_in_too_far` | Check-in location too far |
| `check_out_too_far` | Check-out location too far |
| `late_start` | Late start |
| `early_end` | Early end |

---

## Company SLA Report

### Endpoints
```
GET /api/manager/reports/weekly/pdf/
GET /api/manager/reports/monthly/pdf/
POST /api/manager/reports/weekly/email/
POST /api/manager/reports/monthly/email/
```

### Features
- **Header** with company logo and report title
- **KPI Summary Cards** — 3 visual cards at the top:
  - Total Jobs (blue)
  - SLA Violations (red)
  - Success Rate (green/amber/red based on performance)

- **Summary text** with proper grammar:
  - "1 job was completed" vs "5 jobs were completed"
  - "1 violation was detected" vs "3 violations were detected"
  - Top 3 most common issues listed

- **Cleaners with issues** — table with blue header showing:
  - Cleaner name
  - Jobs count
  - SLA violations count

- **Locations with issues** — table with blue header showing:
  - Location name
  - Jobs count
  - SLA violations count

- **Top SLA reasons** — table with red header showing:
  - Human-readable reason labels
  - Count of occurrences

- **Footer** — generation timestamp, company name, page number

### Color Scheme
| Element | Color |
|---------|-------|
| Table headers (Cleaners/Locations) | Blue (#1e40af) |
| Table headers (SLA Reasons) | Red (#dc2626) |
| KPI Card - Jobs | Light blue (#f0f9ff) |
| KPI Card - Violations | Light red (#fef2f2) |
| KPI Card - Success Rate | Light green (#f0fdf4) |
| Alternating rows | White / Light gray (#f8fafc) |

---

## Technical Details

### Dependencies
- `reportlab` — PDF generation
- `Pillow` — Image processing (for photos)

### Key Functions
```python
# apps/api/pdf.py

generate_job_report_pdf(job: Job) -> bytes
generate_company_sla_report_pdf(company, report_data: dict) -> bytes
```

### Helper Functions
```python
_get_reason_label(code: str) -> str      # SLA reason code to label
_get_event_type_label(event_type: str) -> str  # Event type to label
_get_company_logo_image(company, max_height)   # Get company logo
_draw_footer(canvas, doc, job_id)        # Job report footer
_draw_company_report_footer(canvas, doc, company_name)  # Company report footer
```

---

## Export (XLSX)

### Endpoint
```
POST /api/manager/jobs/export/
```

### Request Body
```json
{
  "from": "2026-01-01",
  "to": "2026-01-31",
  "location_id": 123,      // optional
  "cleaner_id": 456,       // optional
  "sla_status": "violated" // optional: "ok" | "violated"
}
```

### Features
- Excel format (.xlsx) with openpyxl
- Blue header row with white text
- Columns include both readable names and IDs
- Alternating row colors
- Auto-sized columns

### Columns
| Column | Description |
|--------|-------------|
| Job ID | Unique job identifier |
| Status | Job status |
| Scheduled Date | Date of job |
| Scheduled Time | Start - End time |
| Actual Start | Actual start timestamp |
| Actual End | Actual end timestamp |
| Location | Location name |
| Location ID | Location identifier |
| Address | Full address |
| Cleaner | Cleaner name |
| Cleaner ID | Cleaner identifier |
| SLA Status | "ok" or "violated" |
| SLA Reasons | Comma-separated reasons |

---

## Future Improvements
- [ ] Add charts/graphs to SLA reports
- [ ] Add QR code linking to digital report
- [ ] Multi-language support (Arabic/English)
- [ ] Custom branding options per company
