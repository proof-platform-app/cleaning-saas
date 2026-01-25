# SCALE_BRIEF.md

## Layer 5 — Scale & Enterprise Readiness (Direction Only)

This layer defines **meaningful scale improvements**, not feature expansion for its own sake.  
The goal is to reduce operational friction, human overhead, and risk as customer volume grows.

Layer 5 is intentionally **not part of the MVP** and does not represent current product state.  
It exists to define a clean, logical path to higher-value customers and pricing tiers.

---

## 1. Operational Analytics (Decision-Oriented)

Analytics must answer concrete operational questions, not provide vanity dashboards.

### Core metrics

- Job completion rate without issues  
- Proof compliance rate (before / checklist / after)  
- Planned vs actual job duration  
- Cleaner reliability indicators (derived from behavior, not manual scoring)  
- Locations with repeated issues  

### Purpose

- Enable managerial decisions  
- Justify product value  
- Tie CleanProof to measurable business outcomes  

---

## 2. SLA & Exception Management

Introduce automatic exception detection to reduce manual investigations.

### Examples

- Late check-in / check-out  
- Missing or invalid proof  
- Incomplete checklist  

Jobs may be flagged as:

- OK  
- At Risk  
- Violated  

### Purpose

- Prevent disputes  
- Reduce internal escalations  
- Make issues visible before clients complain  

---

## 3. Performance Reports (Management-Level)

Reports are designed for stakeholders who may not use the product daily.

### Examples

- Weekly summary (jobs completed, issues, exceptions)  
- Monthly performance overview  
- Cleaner and location performance snapshots  

### Delivery formats

- PDF  
- Email summary  

### Purpose

- Keep leadership informed  
- Increase perceived product value  
- Reduce manual reporting  

---

## 4. Audit Exports & Legal Readiness

Support formal audit and compliance scenarios.

### Examples

- Full job proof export (PDF / ZIP)  
- Audit trail export (CSV / PDF)  
- Timestamped and immutable proof artifacts  

### Purpose

- Enterprise readiness  
- Legal defensibility  
- Higher ARPU justification  

---

## 5. Hierarchy & Role Expansion

Support growth beyond a single manager role.

### Examples

- Company → branches → locations  
- Roles:
  - Owner  
  - Regional manager  
  - Site manager  

### Purpose

- Access control at scale  
- Data isolation  
- Operational clarity  

---

## 6. Integrations (Reactive, Not Prescriptive)

Focus on outbound integrations only.

### Examples

- Webhooks (job completed, job failed, proof missing)  
- CSV exports  
- Basic REST access  

### Purpose

- Allow clients to integrate CleanProof into existing systems  
- Avoid tight coupling with third-party platforms  

---

## Explicitly Out of Scope for Layer 5

The following are intentionally excluded due to low ROI:

- AI-based photo quality scoring  
- Automated quality judgments without ground truth  
- Real-time dashboards  
- “Smart recommendations” without validated data  

Layer 5 exists to **protect scalability**, not to increase complexity.

---

## Layer 5 × Pricing Alignment

Layer 5 capabilities are not baseline features.  
They represent **enterprise readiness** and are intentionally tied to higher pricing tiers.

---

## Standard Plan — Operational Proof (Core)

### Target customer

- Small to mid-size cleaning teams  
- Owner-managed or single-manager operations  

### Included

- Full proof flow (GPS check-in/out, photos, checklist, PDF)  
- Job Planning (daily / date-based)  
- Basic filtering (date, cleaner, location)  
- Manual issue review  
- Trial with enforced limits  

### Excluded by design

- Advanced analytics  
- SLA flags and exception tracking  
- Performance reports  
- Audit exports  
- Role hierarchy  

Standard focuses on **proof of work**, not optimization.

---

## Pro Plan — Operational Control & Visibility

### Target customer

- Growing teams  
- Companies managing multiple cleaners and locations  
- Managers responsible for quality and accountability  

### Includes everything in Standard, plus

Layer 5 features enabled:

- Operational analytics (compliance, reliability, duration)  
- SLA & exception flags (late check-in, missing proof)  
- Performance reports (weekly / monthly summaries)  
- Audit-ready exports (PDF / CSV / ZIP)  
- Expanded filters and visibility  
- Priority support / escalation  

Pro is positioned as:

> “Not just proof — control and insight.”

This tier directly reduces:

- Manual investigations  
- Internal escalations  
- Reporting overhead  

---

## Enterprise (Future Tier) — Scale & Compliance

### Target customer

- Large operators  
- Multi-branch organizations  
- Compliance-driven contracts  

### Planned capabilities

- Role hierarchy (owner / regional / site)  
- Branch-level access control  
- Webhooks & outbound integrations  
- Custom audit formats  
- SLA configuration per location  
- Dedicated onboarding and support  

Enterprise pricing is:

- Custom  
- Contract-based  
- Value-driven (not seat-driven)  

---

## Trial Alignment

### Trial behavior

- 7 days  
- Full proof flow enabled  
- Enforced operational limits (e.g. cleaners, jobs)  

### Purpose

- Allow realistic evaluation  
- Prevent misuse  
- Preserve product value perception  

Trial always maps to:

- Standard → upgrade to Pro  
- No direct Enterprise trial  

---

## Pricing Philosophy

- Proof of work is baseline  
- Insight, control, and risk reduction are premium  
- Layer 5 features justify higher ARPU, not feature count  

Pricing increases over time are explained by:

- Expanded visibility  
- Reduced operational cost  
- Enterprise readiness  

---

## Why This Matters

This structure ensures:

- Clean upgrade path  
- Clear value separation  
- No need to invent features to raise price  
- Confidence when selling to larger clients  
