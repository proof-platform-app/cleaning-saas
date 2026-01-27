## Layer 5 — Scale & Enterprise Readiness (Direction Only)

This layer defines **meaningful scale improvements**, not feature expansion for its own sake.  
The goal is to reduce operational friction, human overhead, and risk as customer volume grows.

Layer 5 is intentionally **not part of the MVP** and does not represent current product state.  
It exists to define a clean, logical path to higher-value customers and pricing tiers.

---

## 0. Trial, Usage & Pre-Billing Architecture (Foundation for Scale)

Before introducing enterprise features, CleanProof establishes a **clear separation between operational truth and commercial logic**.

### Source of truth

- Trial state, expiration, and usage metrics are calculated **only on the backend**
- Frontend consumes a single aggregated endpoint:
  - `GET /api/cleanproof/usage-summary/`
- UI never infers trial state locally

### What exists today

- Trial lifecycle:
  - start
  - active
  - expired
- Usage visibility:
  - jobs created today
  - active cleaners
  - soft-limits exposed to UI
- UX enforcement:
  - informational banners
  - upgrade CTAs
  - limited hard-blocking (job creation after trial expiry)

### Why this matters for scale

This architecture allows CleanProof to:

- Add billing (Stripe / Paddle) **without rewriting business logic**
- Introduce plan enforcement gradually
- Support multiple pricing tiers cleanly
- Avoid hidden coupling between UI and billing rules

Layer 5 builds **on top of this foundation**, not around it.

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
### micro-SLA v2 — Time-Based Rules & Repeated Violations (Future Extension)

micro-SLA v2 extends basic SLA flags by adding **temporal context and behavioral patterns**.  
This layer does not introduce contractual enforcement.  
It exists to support **operational coaching, quality management, and escalation logic** at scale.

micro-SLA v2 is intentionally **not part of the MVP**.

---

#### Time-based rules (contextual violations)

Instead of binary states (OK / Violated), SLA violations gain **time deltas**:

Examples:

- Check-in late by X minutes  
- Job completed after scheduled end time  
- After photo uploaded X minutes after check-out  

This allows managers to distinguish between:

- Minor delays  
- Systematic timing issues  
- Critical breaches  

Time deltas are calculated **only on the backend** using recorded timestamps.

Frontend displays them as read-only context.

---

#### Repeated violations (pattern detection)

micro-SLA v2 introduces **rolling window aggregation**:

Examples:

- Cleaner has 3 SLA violations in last 7 days  
- 2 consecutive jobs missing after photo  
- 5 of last 10 jobs violated SLA  

This transforms SLA from single-job auditing into **behavioral insight**.

No new actions are triggered automatically.

The system only exposes:

- counts  
- frequency  
- recent patterns  

Decision-making remains human.

---

#### Scope & Constraints

Explicitly excluded from micro-SLA v2:

- Automatic penalties  
- Job blocking  
- Score systems  
- AI-based judgment  

The goal is **visibility and clarity**, not automation.

---

#### Why micro-SLA v2 exists

micro-SLA v2 enables:

- Cleaner coaching instead of punishment  
- Early detection of reliability issues  
- Better escalation conversations  
- Stronger Pro / Enterprise value proposition  

It supports growth without increasing operational friction.

---

#### Pricing alignment

micro-SLA v2 capabilities are aligned with higher tiers:

- **Standard**: micro-SLA v1 (status + reasons)  
- **Pro**: time-based context + repeated violations  
- **Enterprise**: configurable rules and reporting windows  

This ensures SLA sophistication scales with customer maturity.

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
