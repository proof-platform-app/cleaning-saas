# Mobile Cleaner App — State Document

**Date:** 2026-02-11
**App:** `mobile-cleaner` (Expo / React Native, TypeScript)
**Authors:** platform_architect + mobile_frontend_engineer
**Status:** factual snapshot, read-only; no code changes made here

> This document describes **what the app actually does today** (derived from code),
> how it behaves without internet, and a prioritised roadmap of improvements.
> It does NOT describe aspirational or future behaviour as present fact.

---

## 1. Scope & Context

### What it is

CleanProof Cleaner App is a React Native / Expo application that puts the
execution workflow in the hands of individual cleaners. It is **Layer 1** in
the Proof Platform stack:

```
Layer 0 — Backend (Django / DRF) + Manager Portal (Web)
Layer 1 — Cleaner App (this document)
Layer 2 — Management (Portal analytics, reports, planning)
```

### Relation to backend and Manager Portal

- All state lives on the backend. The app has **no persistent local database**.
- The `AsyncStorage` usage is currently limited to: auth token persistence
  (`@auth_token` key) and generic JSON cache helpers (`job:N:part` keys)
  that are defined but **not yet called from any screen**.
- After a cleaner completes a job, the Manager Portal immediately sees the
  audit trail (timeline, photos, checklist, SLA) through the same backend.

### Flows covered (by code)

```
Login ──► Today Jobs ──► Job Details ──► Check-in
                                             │
                                    Before photo upload
                                             │
                                    Checklist (per-item toggle)
                                             │
                                    After photo upload
                                             │
                                       Check-out ──► PDF share
```

Navigation is a simple `NativeStackNavigator` with three routes:
`Login`, `Jobs`, `JobDetails`.

---

## 2. Current Capabilities (Execution)

### 2.1 Login / Auth

| Aspect | Detail |
|--------|--------|
| Screen | `LoginScreen.tsx` |
| Endpoint | `POST /api/auth/login/` |
| Credentials | email + password (no role selection in UI) |
| Token storage | `AsyncStorage` key `@auth_token`; loaded on app start via `loadStoredToken()` |
| Auto-login | Yes — on cold start `App.tsx` calls `loadStoredToken()`; if token exists, opens `Jobs` directly (no Login flash) |
| Logout | No explicit logout screen or button currently exists |
| Pre-filled dev creds | `cleaner@test.com` / `Test1234!` hardcoded in `LoginScreen` state defaults |
| Error display | `Alert.alert("Login failed", …)` |

### 2.2 Today Jobs list

| Aspect | Detail |
|--------|--------|
| Screen | `JobsScreen.tsx` |
| Endpoint | `GET /api/jobs/today/` via `fetchTodayJobs()` (alias of `fetchCleanerTodayJobs()`) |
| Response type | `CleanerJobSummary[]` — flat shape with `location__name`, `status`, `scheduled_date/time` |
| Refresh | Pull-to-refresh via `RefreshControl` |
| Error display | Inline text "Session expired. Please log in again." (regardless of actual error type) |
| Offline behaviour | **No detection** — screen simply shows error text if the request fails |
| Navigation | Tap card → `JobDetails` with `{ jobId }` |
| Location field fallback | `location__name` → `location_name` → `location` → `name` → "Cleaning job" |

> **Note:** `JobsScreen` has **no connectivity awareness**. If the device is offline,
> the load silently fails and shows a generic error message.

### 2.3 Job Details

| Aspect | Detail |
|--------|--------|
| Screen | `JobDetailsScreen.tsx` |
| Endpoint | `GET /api/jobs/{id}/` — single canonical URL (simplified in Phase C) |
| Photos endpoint | `GET /api/jobs/{id}/photos/` |
| Data shown | Location name + address, scheduled date, status badge, progress steps (6-step), timeline (check events), before/after photos, checklist, action buttons |
| Supplementary type | `JobDetail` (defined in `client.ts`; augmented in Phase C with optional location fields) |

**Progress block (6 steps, `JobProgressBlock.tsx`):**
1. Scheduled
2. Check-in
3. Before photo
4. Checklist (required items only)
5. After photo
6. Check-out

**Timeline (`JobTimelineSection.tsx`):** renders `check_in` / `check_out` events
from `job.check_events`, sorted ASC, showing time + user name + distance in metres.

### 2.4 Check-in

| Aspect | Detail |
|--------|--------|
| Endpoint | `POST /api/jobs/{id}/check-in/` with `{ latitude, longitude }` |
| Status guard | Only allowed when `status === "scheduled"` |
| Online guard | Hard blocked offline — `Alert.alert("Offline", "You need internet to check in.")` |
| GPS | `getGpsPayload()` in `utils/gps.ts`; in `__DEV__` forces job's own coordinates |
| GPS fallback | If device GPS unavailable and job has coords → uses job coords + shows Alert |
| GPS failure | Throws `GPS_UNAVAILABLE` → caught and shown as `Alert.alert("Location unavailable", …)` |
| Confirm dialog | `Alert.alert("Check in", "Start this job now?", [Cancel, Check in])` before calling API |
| Post-action | Full refetch: `fetchJobDetail` + `fetchJobPhotos` + sets `checklist_items` |

### 2.5 Check-out

| Aspect | Detail |
|--------|--------|
| Endpoint | `POST /api/jobs/{id}/check-out/` with `{ latitude, longitude }` |
| Status guard | Only allowed when `status === "in_progress"` |
| Online guard | Hard blocked offline |
| Preconditions (UI) | `beforePhoto && afterPhoto && checklistState.checklistOk && isOnline` |
| GPS | Same as check-in |
| Confirm dialog | `Alert.alert("Check out", "Finish this job and lock photos and checklist?", [Cancel, Check out])` |
| Post-action | Full refetch |

### 2.6 Photos (before / after)

| Aspect | Detail |
|--------|--------|
| Component | `JobPhotosBlock.tsx` (UI only, no logic) |
| Logic | `handleTakePhoto()` in `JobDetailsScreen.tsx` |
| Camera | `expo-image-picker`, `launchCameraAsync`, quality 0.7 |
| Upload endpoint | `POST /api/jobs/{id}/photos/` — FormData with fields `photo_type` and `file` |
| Upload spinner | `uploadingType` state (`"before" \| "after" \| null`); shown per photo slot |
| Upload retry | Yes — on failure `Alert.alert("Photo upload failed", …, [Try again, Cancel])` using cached URI |
| Order enforcement | After photo button disabled until before photo exists (`canTakeAfterPhoto = isInProgress && !!beforePhoto && !afterPhoto`) |
| Post-upload | Full refetch: `fetchJobDetail` + `fetchJobPhotos` |
| Offline behaviour | Upload will fail with network error; retry affordance available; **no offline queue implemented** |

### 2.7 Checklist

| Aspect | Detail |
|--------|--------|
| Component | `ChecklistSection.tsx` |
| Toggle endpoint | `POST /api/jobs/{id}/checklist/{itemId}/toggle/` with `{ is_completed }` |
| Concurrency guard | `savingItemId !== null` prevents a second tap while save is in-flight (Phase A) |
| Saving indicator | Per-item `ActivityIndicator` when `savingItemId === item.id` |
| Error display | `checklistError` shown below checklist as red text |
| Retry affordance | Yes — `failedItemId` / `failedNextValue` state; "Failed to save. Tap to retry." inline (Phase C) |
| Post-toggle | Full refetch of `fetchJobDetail` to stay in sync with backend required-item validation |
| Offline behaviour | Toggle will fail with network error; retry affordance remains visible |

### 2.8 PDF Report

| Aspect | Detail |
|--------|--------|
| Endpoint | `POST /api/jobs/{id}/report/pdf/` |
| Available when | `status === "completed" && isOnline` |
| Output | Binary PDF streamed as `ArrayBuffer`, written to `FileSystem.cacheDirectory`, shared via `Sharing.shareAsync` |
| Online guard | Hard blocked offline |

---

## 3. Network & Offline Behaviour (FACTUAL)

### 3.1 How `isOnline` is determined

Source: `@react-native-community/netinfo` — `NetInfo.addEventListener`.

```typescript
// JobDetailsScreen.tsx
const online = !!state.isConnected && state.isInternetReachable !== false;
setIsOnline(online);
```

- `isOnline` starts as `null` (not yet determined).
- Transitions: `null → false/true` on first NetInfo event, then `true/false` on changes.
- **Only `JobDetailsScreen` subscribes to NetInfo.** `JobsScreen` and `LoginScreen`
  have no connectivity awareness.
- `isOnline === null` is treated as "not loaded yet" — the `load` effect waits for it
  before fetching (`if (isOnline === null) return`).

### 3.2 What the user sees when opening Job Details offline

1. NetInfo fires → `isOnline = false`.
2. Load effect runs: `if (!isOnline) { setLoading(false); return; }` — no fetch is attempted.
3. `loading = false`, `job = null`.
4. Screen renders the empty state:
   ```
   "You are offline. Job details are unavailable."
   [Retry]
   ```
5. **No cached job data is shown** — if the cleaner was mid-job and lost connectivity,
   they see a blank screen with no progress, no checklist, no location address.
6. "Retry" button increments `retryCount`, which re-triggers the load effect. If still
   offline, the same empty screen appears.

### 3.3 Behaviour of each feature offline

| Feature | Offline behaviour |
|---------|------------------|
| Today Jobs list | No network detection; request fails silently; shows generic error "Session expired" |
| Job Details load | Detected; empty state shown with Retry button |
| Check-in | Hard blocked with `Alert.alert("Offline", …)` |
| Check-out | Hard blocked with `Alert.alert("Offline", …)` |
| Photo upload | Network error thrown by `apiFetch`; caught; "Try again / Cancel" Alert shown |
| Checklist toggle | Network error thrown; caught; "Failed to save. Tap to retry." inline shown |
| PDF share | Hard blocked with `Alert.alert("Offline", …)` |
| Navigate (maps) | Not blocked — opens external app (Maps), which works offline |

### 3.4 What the outbox is today

The outbox architecture is **stub-only**. Here is the full factual picture:

**What exists:**

| File | Role |
|------|------|
| `src/offline/types.ts` | Type definitions for `ChecklistBulkOutboxItem` and `PhotoOutboxItem`; no runtime logic |
| `src/offline/storage.ts` | Generic `AsyncStorage` helpers (`cacheSetJSON / cacheGetJSON / cacheRemove`); **never called from any screen** |
| `src/services/outbox.ts` | `OutboxService` interface + `defaultOutboxService` wrapping `(global as any).outboxPeek/outboxShift` |

**What `flushOutbox` does in `JobDetailsScreen`:**

```typescript
// Runs when isOnline transitions to true
const item = await defaultOutboxService.peek(); // → null (globals never set)
if (!item) break; // always exits immediately
```

Because `(global as any).outboxPeek` is never assigned anywhere in the app,
`defaultOutboxService.peek()` always returns `null`. The `while(true)` loop
exits on the first iteration. **No real outbox flushing ever happens.**

**What is genuinely missing:**

- No code that *writes* to the outbox (no `outboxPush` implementation).
- No `AsyncStorage`-backed queue.
- No service that accepts checklist toggles or photo uploads when offline and
  stores them for later replay.

The outbox is a **well-designed placeholder** with correct types and interface,
but it is currently a no-op.

### 3.5 Online → offline → online transition

**When connection is lost:**
- If Job Details is already loaded, the banner `"You are offline. Some actions
  are disabled."` appears (via `isOnline === false` condition in the merged
  banner block).
- Check-in, check-out, and PDF share are disabled.
- Photo upload and checklist toggle remain interactable but fail with retry UI.

**When connection is restored:**
- NetInfo fires; `isOnline` becomes `true`; `flushOutbox()` is called.
- Since the outbox is always empty, `flushOutbox` does a full refetch of
  `fetchJobDetail` + `fetchJobPhotos` immediately after the while-loop exits.
- The `isSyncing → visibleSyncing` debounce (300 ms) means: for an empty
  outbox the sync completes in < 300 ms and **the sync banner is never shown**
  to the user. For a long-running flush it would appear after 300 ms.
- There is **no explicit "synced" confirmation** message after the refresh.

### 3.6 Known UX gaps (offline)

| Gap | Impact |
|-----|--------|
| **No cached job data** | Cleaner loses all context (address, checklist, photos) when opening Job Details offline or after app restart without network |
| **JobsScreen has no offline detection** | Network failure shows ambiguous "Session expired" error instead of "You are offline" |
| **No offline queue for checklist** | Toggling an item offline: error shown, retry available, but if cleaner navigates away the change is lost |
| **No offline queue for photos** | Same as checklist — cached URI not persisted; if app is closed before connection restored, photo must be re-taken |
| **Outbox never filled** | `flushOutbox` logic is correct but runs on empty queue every time |
| **No "data last synced at" indicator** | User cannot tell if what they see is fresh or stale |
| **No success state after sync** | After reconnecting, data is silently refreshed; no visual confirmation |
| **Sync banner never shown in practice** | Because flushOutbox always completes in < 50 ms (empty queue), the 300 ms debounce means the banner is invisible |

---

## 4. Error Handling & UX Safety

### 4.1 Network errors

`apiFetch` in `client.ts` catches:
- `AbortError` (30-second timeout) → "Request timed out. Please check your
  connection and try again."
- `Network request failed` / `Failed to fetch` / `Network Error` → "No internet
  connection. Please check your network and try again."

These messages surface to the caller; each screen decides how to display them
(Alert or inline).

### 4.2 Error display patterns

| Pattern | Where used |
|---------|-----------|
| `Alert.alert(title, message)` | Login failure, check-in/out failure, GPS errors, photo camera errors, PDF failure |
| Inline red text | `checklistError` in `ChecklistSection`, `error` in `JobsScreen` |
| Inline retry affordance | "Failed to save. Tap to retry." in `ChecklistSection` (Phase C) |
| "Try again / Cancel" Alert | Photo upload failure (Phase B) |
| Offline banner | Top of `JobDetailsScreen` scroll view when `isOnline === false` |
| Action-level hint text | `JobActionsSection` shows per-status offline hint text |

### 4.3 State inventory

| State | Location | Meaning |
|-------|----------|---------|
| `isOnline: boolean \| null` | `JobDetailsScreen` | Network status from NetInfo |
| `loading: boolean` | `JobDetailsScreen` | Initial fetch in progress |
| `submitting: boolean` | `JobDetailsScreen` | Check-in / check-out / PDF in progress |
| `uploadingType: "before" \| "after" \| null` | `JobDetailsScreen` | Photo upload in progress |
| `isSyncing: boolean` | `JobDetailsScreen` | outbox flush in progress |
| `visibleSyncing: boolean` | `JobDetailsScreen` | Debounced (300 ms) isSyncing for banner |
| `isChecklistSaving: boolean` | `JobDetailsScreen` | Any checklist toggle in progress |
| `savingItemId: number \| null` | `JobDetailsScreen` | Specific item being saved (prevents double-tap) |
| `checklistError: string \| null` | `JobDetailsScreen` | Last checklist toggle error |
| `failedItemId: number \| null` | `JobDetailsScreen` | Item for which toggle last failed (retry target) |
| `failedNextValue: boolean \| null` | `JobDetailsScreen` | Value to retry with |
| `retryCount: number` | `JobDetailsScreen` | Incremented to re-trigger load effect |

### 4.4 Potential problems

| Problem | Description |
|---------|-------------|
| **GPS fallback Alert during production check-in** | If device GPS fails and job coords exist, `Alert.alert("Location fallback", …)` fires inside `getGpsPayload` before the calling handler gets control; cleaner sees an unexpected alert mid-flow |
| **JobsScreen error message is misleading** | Any API error (403, 500, network failure) shows "Session expired" — this is inaccurate for most network failures |
| **Photo upload retry after navigation** | If a cleaner navigates away from Job Details after a failed upload (before retrying), the cached URI is lost (closure goes out of scope) and the photo must be re-taken |
| **Checklist error not cleared on unmount** | If screen remounts (navigation stack), `checklistError` / `failedItemId` reset is not guaranteed |
| **No loading state on Checklist post-toggle refetch** | After a toggle, `setIsChecklistSaving(false)` fires before the `fetchJobDetail` call returns; the UI briefly shows no spinner during the refetch |
| **`checklistState` prop passed to ChecklistSection but unused** | Pre-existing — `checklistState` is destructured but no JSX in the component reads it |

---

## 5. Known Limitations (Layer 1 — Execution Only)

1. **No offline-first job detail.** Opening Job Details without internet shows a
   blank screen. No cached copy of the last-loaded job is stored anywhere.

2. **No offline checklist.** Checklist toggles require a live network call. If
   the toggle fails, a retry affordance is shown, but the value is not persisted
   and will be lost if the app is closed.

3. **No offline photo upload queue.** Photos are uploaded immediately. If the
   upload fails, a retry button appears, but the local URI is held only in a
   JavaScript closure — it does not survive app restart.

4. **Check-in and check-out are strictly online.** This is by design (GPS
   validation, status transition). No change proposed here.

5. **JobsScreen has no connectivity awareness.** A cleaner who opens the app
   without internet sees a misleading "Session expired" error.

6. **No logout UI.** There is no way for a cleaner to sign out from within the
   app. Auth token persists in `AsyncStorage` until `setAuthToken(null)` is
   called programmatically.

7. **Token expiry not handled.** A 401 response from the backend is caught by
   `apiFetch` as an `ApiError` with `status: 401`, but no automatic redirect to
   Login happens. The cleaner sees an error alert.

8. **`outbox` infrastructure is stub-only.** Types and service interface exist;
   no actual queue is written or read.

9. **`src/offline/storage.ts` is imported nowhere.** `cacheSetJSON` /
   `cacheGetJSON` / `getDevGpsPayload` are defined but never called.

10. **`src/types/job.ts` is imported nowhere.** A parallel `JobDetail` interface
    (with `location: LocationInfo` as required) exists but is not used — the app
    uses the `JobDetail` from `api/client.ts`.

11. **Dev GPS bypass active in all Expo Go builds.** `DEV_FORCE_JOB_COORDS = __DEV__`
    means every Expo Go session sends job coordinates instead of real device GPS.
    This could mask location validation issues during development testing.

12. **No background sync.** There is no background process or push notification
    integration to notify the cleaner of new or changed jobs.

---

## 6. Improvement Roadmap (Phase D / E / F proposals)

These are proposals only. No code changes made in this document.

---

### D. Reliability & Offline-first (short term, 1–2 sprints)

---

#### D-1 — Offline job cache (read-only)

**What changes:** After a successful `fetchJobDetail` call, write the result to
`AsyncStorage` using the existing `cacheSetJSON(jobId, "detail", jobData)` helper.
On load, if `isOnline === false` and cache exists, display the cached data with a
visible "Offline — showing last saved data (HH:MM)" badge. Cache TTL: 24 hours.

**Key files:** `JobDetailsScreen.tsx`, `src/offline/storage.ts`

**UX:** Cleaner can see their job address, checklist state, and progress even
without internet. Check-in / check-out remain blocked (by design).

**Safety:** SAFETY ONLY — no change to execution logic.

---

#### D-2 — Real outbox for checklist toggles

**What changes:** When a checklist toggle fails due to a network error (or when
`isOnline === false`), write the pending item to an `AsyncStorage`-backed queue
via `outboxPush(item)`. When the device reconnects, `flushOutbox` processes the
real queue. Remove the global stub dependency.

**Key files:** `src/services/outbox.ts`, `src/offline/storage.ts`, `JobDetailsScreen.tsx`

**UX:** Cleaner can tick checklist items offline; they sync automatically on reconnect.

**Safety:** SAFETY ONLY — only checklist_bulk type; check-in/out never queued.

---

#### D-3 — Real outbox for photo uploads

**What changes:** If photo upload fails and the device is offline, save the local
URI to the outbox queue. On reconnect, replay the upload via `flushOutbox`.
Requires the local URI to survive the in-memory closure (write to
`AsyncStorage` or `FileSystem.documentDirectory`).

**Key files:** `src/services/outbox.ts`, `src/offline/storage.ts`, `JobDetailsScreen.tsx`

**UX:** "Photo saved for upload when online" indicator instead of immediate error.

**Safety:** SAFETY ONLY — no change to upload endpoint or photo order logic.

---

#### D-4 — JobsScreen offline detection

**What changes:** Add `NetInfo.addEventListener` to `JobsScreen` (or a shared
hook). Show "You are offline — pull to refresh when connected" instead of the
current generic error text.

**Key files:** `JobsScreen.tsx`, optionally a new `src/hooks/useNetworkState.ts`

**UX:** Cleaner understands why the jobs list is empty.

**Safety:** SAFETY ONLY — no change to API calls.

---

#### D-5 — 401 auto-redirect to Login

**What changes:** In `apiFetch`, when `resp.status === 401`, call
`setAuthToken(null)` and navigate to the Login screen (via a navigation ref
or event emitter).

**Key files:** `src/api/client.ts`, `App.tsx`

**UX:** Expired token → cleaner is taken back to Login instead of seeing
an error alert.

**Safety:** SAFETY ONLY — no change to auth or backend logic.

---

### E. UX & Comfort (mid term)

---

#### E-1 — "Last synced" timestamp on Job Details header

**What changes:** Store `savedAt` from `cacheGetJSON` and display "Last synced: HH:MM"
in the header when online, "Offline — showing data from HH:MM" when offline.

**Key files:** `JobDetailsScreen.tsx`, `src/offline/storage.ts`

---

#### E-2 — Persistent sync indicator (non-blocking)

**What changes:** Replace the full-width banner for `visibleSyncing` with a small
corner badge (e.g., a pulsing dot) so it doesn't cause layout shift. The current
300 ms debounce would keep it invisible for fast flushes.

**Key files:** `JobDetailsScreen.tsx`, potentially a new `SyncIndicator` component.

---

#### E-3 — Actionable error messages for specific API failures

**What changes:** Parse `e.status` from `ApiError` to give specific messages:
- 401 → "Session expired. Please log in again."
- 403 → "You don't have permission for this action."
- 404 → "Job not found."
- 422/400 → show `e.details` in a human-readable way.

**Key files:** `JobDetailsScreen.tsx`, `JobsScreen.tsx`

---

#### E-4 — Logout button

**What changes:** Add a logout button to `JobsScreen` header. Calls
`setAuthToken(null)` and navigates back to `Login`.

**Key files:** `JobsScreen.tsx`, `src/api/client.ts`

---

### F. Architecture & Tech Debt (mid term)

---

#### F-1 — Consolidate `JobDetail` types

**What changes:** Remove `src/types/job.ts` (unused, diverged from reality)
or align it with `api/client.ts:JobDetail`. Currently two parallel `JobDetail`
definitions exist that are incompatible.

**Key files:** `src/types/job.ts`, `src/api/client.ts`

---

#### F-2 — Shared `useNetworkState` hook

**What changes:** Extract `NetInfo.addEventListener` + `isOnline` state into a
reusable hook. Currently only `JobDetailsScreen` is network-aware.

**Key files:** New `src/hooks/useNetworkState.ts`; `JobDetailsScreen.tsx`,
`JobsScreen.tsx` to import it.

---

#### F-3 — Remove hardcoded dev credentials from `LoginScreen`

**What changes:** Move `cleaner@test.com` / `Test1234!` to `__DEV__`-guarded
defaults only, or remove entirely from production build.

**Key files:** `LoginScreen.tsx`

---

#### F-4 — Activate `src/offline/storage.ts`

**What changes:** Wire up `cacheSetJSON` / `cacheGetJSON` as the backing store
for D-1 (job detail cache) and D-2/D-3 (outbox). Until then the file is dead code.

**Key files:** `src/offline/storage.ts`, `src/services/outbox.ts`

---

#### F-5 — Dead code cleanup

**What changes:**
- `src/offline/storage.ts:getDevGpsPayload` — superseded by `utils/gps.ts`; remove.
- `src/types/job.ts` — unused; either wire up or delete.
- `checklistState` prop in `ChecklistSection` — declared in Props but never read;
  remove or use.

**Key files:** `src/offline/storage.ts`, `src/types/job.ts`,
`src/components/job-details/ChecklistSection.tsx`

---

## 7. Execution Invariants (Non-Negotiable Rules)

These are architectural constraints that **must never be violated** by any mobile
implementation, offline mode, or performance optimisation. They are enforced by
the backend and exist to protect the integrity of the proof verification engine.

### 7.1 Check-in and Check-out are backend-validated only

- Mobile **must never** implement client-side business logic for determining
  whether a check-in or check-out is allowed (SLA time windows, distance
  thresholds, status preconditions).
- The mobile app sends GPS coordinates to the backend and **trusts the backend
  response**.
- If the backend returns 400 or 422 with validation errors, the mobile app
  shows the message returned by the backend — it does not interpret, override,
  or "help" the cleaner bypass the validation.

### 7.2 SLA logic must never exist in mobile

- SLA compliance (on-time, late, job window enforcement) is computed **only**
  by the backend.
- The mobile app **may** display SLA status badges and time windows from the
  `JobDetail` response, but it **must not** calculate, infer, or adjust these
  values locally.
- No offline mode may create, update, or infer SLA state.

### 7.3 Photos are not valid until backend confirms upload

- A photo is not considered part of the audit record until the backend returns
  a `201 Created` response with a `photo_id`.
- The mobile app **must not** mark the "before photo" or "after photo" progress
  step as complete based on a cached local URI alone.
- If an upload is queued in the outbox (offline mode), the progress step
  remains incomplete until the backend acknowledges the upload.

### 7.4 Backend is the source of truth, even when mobile caches

- All cached job data in `AsyncStorage` is **read-only** from the mobile app's
  perspective.
- The mobile app **must not** apply local edits to cached `JobDetail` or
  checklist state without a successful backend call.
- When online, the mobile app **must refetch** after every mutating action
  (check-in, check-out, photo upload, checklist toggle) to stay in sync with
  backend-enforced validation.

### 7.5 No silent failures

- Every mutating action (check-in, check-out, photo upload, checklist toggle)
  **must** provide explicit UX feedback:
  - Success → visual confirmation (e.g., refetch + updated UI state).
  - Failure → inline or alert error message with retry affordance.
- The app **must never** pretend an action succeeded when the backend rejected
  it or the network call failed.
- Optimistic UI updates are **forbidden** for check-in, check-out, and photo
  uploads. Checklist toggles may show a pending spinner, but the `is_completed`
  state is only updated after a successful backend response.

### 7.6 Offline support must preserve audit integrity

- Outbox queue (if implemented) **may only** contain:
  - Checklist toggle actions (`checklist_bulk` type).
  - Photo upload actions (`photo` type) with persisted local URI.
- Outbox **must never** queue:
  - Check-in or check-out actions.
  - Status transitions.
  - Job detail edits.
- When the outbox is flushed on reconnect, items are replayed in the order they
  were queued, and **each replay must refetch job detail** to validate the
  current backend state before continuing.

### 7.7 Proof sequence is server-side enforced

- The backend enforces the proof sequence:
  `scheduled → check-in → before photo → checklist → after photo → check-out → completed`.
- The mobile app **must** respect the `status` field returned by the backend
  and **must not** allow actions out of sequence (enforced via UI disabled
  states, not client-side validation).
- The mobile app **may** show friendly helper text ("You need to check in
  first") but the actual gate is the backend's 400/422 response.

### 7.8 GPS coordinates must be real device coordinates in production

- The `__DEV__` bypass (`DEV_FORCE_JOB_COORDS`) that sends the job's own
  coordinates instead of device GPS **must be disabled** in all production
  builds.
- Production check-in and check-out **must** use real GPS from
  `expo-location` (or equivalent) or fail with `GPS_UNAVAILABLE` if the device
  location is not available.
- The fallback to job coordinates (with Alert) in `utils/gps.ts` is acceptable
  for development/testing **only** and must be removed or gated behind a
  backend-controlled "allow GPS bypass" flag for production.

---

## 8. Policy Layer & Future Relaxations

The platform is designed with **strict defaults** and **backend-driven policy**
to allow selective relaxation of execution rules without changing mobile code.

### 8.1 Default rules are strict

By default, the backend enforces:
- SLA time windows (late if check-in after `scheduled_time + SLA window`).
- GPS validation (distance from location).
- Proof sequence (no after photo before before photo).
- Required checklist items (check-out blocked if any required item incomplete).

These defaults align with the verification guarantee of the Proof Platform.

### 8.2 Relaxations via backend-driven execution policy

Future backend work may introduce a `ExecutionPolicy` model (or similar) that
allows per-context or per-job relaxations:
- "Allow check-out without after photo" (for emergency jobs).
- "Allow late check-in without SLA violation" (for maintenance context with
  flexible windows).
- "Skip GPS validation for specific locations" (for indoor-only sites).

**Mobile implementation rule:**
The mobile app **must not** hardcode these relaxations. All policy decisions
are returned by the backend in the `JobDetail` response (e.g., a new
`execution_policy` object with boolean flags).

### 8.3 Mobile must not hardcode relaxations

The mobile app **must not** introduce:
- Feature flags (e.g., `ALLOW_CHECKOUT_WITHOUT_PHOTOS`) that bypass backend
  validation.
- Per-context branching logic (e.g., `if (context === "maintenance") { ... }`).
- "Developer mode" overrides that silently skip check-in or proof steps.

Any such logic would fragment the single-platform model and create audit gaps.

### 8.4 All relaxations must be auditable

If a relaxation is applied (via backend policy), it **must** be recorded in the
audit log (e.g., `check_events` or a new `policy_overrides` field in the job
record) so that reports and analytics can distinguish between:
- Jobs completed under strict rules.
- Jobs completed under relaxed rules (and which specific rules were relaxed).

This ensures that the Manager Portal and analytics layer can filter and report
on "fully verified" vs "policy-relaxed" jobs transparently.

---

## 9. Production-Ready Definition

A mobile build is considered **production-ready** when all of the following
criteria are met:

### 9.1 Token expiry handling

- When `apiFetch` receives a `401 Unauthorized` response, the app **must**:
  - Call `setAuthToken(null)` to clear the stored token.
  - Navigate the user back to the `Login` screen automatically (no manual
    logout required).
- Implemented in: `src/api/client.ts:apiFetch`.
- **Current status:** Not implemented (Limitation #7 in §5).

### 9.2 No hardcoded development credentials

- The `LoginScreen` **must not** pre-fill email and password fields with
  `cleaner@test.com` / `Test1234!` in production builds.
- If development credentials are needed for testing, they **must** be gated
  behind `__DEV__` or an explicit "dev mode" flag that is stripped from
  production.
- **Current status:** Dev credentials hardcoded in `LoginScreen` state (see
  F-3 in §6).

### 9.3 Dev GPS bypass removed from production

- `DEV_FORCE_JOB_COORDS` in `utils/gps.ts` **must** be `false` in production.
- The fallback to job coordinates (when device GPS unavailable) **must** either:
  - Be removed entirely (production check-in fails if GPS unavailable), or
  - Be controlled by a backend-returned `allow_gps_fallback` policy flag (see §8).
- **Current status:** `__DEV__` gates the bypass; acceptable for now, but
  Expo Go builds (which are always `__DEV__ = true`) will use fake GPS.

### 9.4 Real outbox implementation (if offline support required)

- If the app is marketed as "offline-capable", the outbox **must** be fully
  implemented:
  - `src/services/outbox.ts` backed by `AsyncStorage` (not global stubs).
  - `outboxPush()` called when checklist toggle or photo upload fails offline.
  - `flushOutbox()` correctly replays queued items on reconnect.
- If offline support is **not** required for production (e.g., cleaners are
  expected to always have internet), the current stub is acceptable, but:
  - The "You are offline" banners must remain, and
  - The app must clearly communicate (via in-app messaging or onboarding) that
    offline mode is not supported.
- **Current status:** Stub only (Limitation #8 in §5); D-2 and D-3 proposals
  would make it production-ready.

### 9.5 Clear offline UX (not blank screen)

- When Job Details is opened offline, the app **must not** show a blank screen
  with "You are offline. Job details are unavailable."
- Either:
  - Show the last cached job detail with a visible "Offline — showing last
    saved data" banner (D-1 proposal), or
  - Show a friendly empty state with "This job requires an internet connection
    to load" and disable navigation to Job Details entirely until online.
- **Current status:** Blank screen with retry button (see §3.2 and §3.6).

### 9.6 No dead code or unused files

- All files in `src/` **must** either be imported and used, or deleted:
  - `src/types/job.ts` — currently unused (F-1).
  - `src/offline/storage.ts:getDevGpsPayload` — superseded (F-5).
- All exported functions in `src/offline/storage.ts` (`cacheSetJSON`,
  `cacheGetJSON`) **must** either be wired up (D-1, F-4) or removed.
- **Current status:** Dead code present (see §5 and F-5).

### 9.7 All `console.log` statements production-guarded

- All bare `console.log` calls **must** be wrapped with `if (__DEV__)` guards
  to prevent logging sensitive data (GPS coordinates, auth tokens, job IDs) in
  production.
- **Current status:** ✅ Implemented in Phase C (C-3).

---

## Appendix: File Map

```
mobile-cleaner/
├── App.tsx                              Entry point, navigation, token hydration
├── src/
│   ├── api/
│   │   └── client.ts                   Single HTTP client, all endpoints, token mgmt
│   ├── screens/
│   │   ├── LoginScreen.tsx             Login form
│   │   ├── JobsScreen.tsx              Today jobs list (no offline awareness)
│   │   ├── JobDetailsScreen.tsx        Main execution screen (all offline logic lives here)
│   │   └── jobDetails.helpers.ts       Pure functions: checklist state, progress, events
│   ├── components/job-details/
│   │   ├── ChecklistSection.tsx        Checklist UI + retry affordance
│   │   ├── JobActionsSection.tsx       Check-in/out/PDF buttons + offline hints
│   │   ├── JobPhotosBlock.tsx          Photos UI (pure, no logic)
│   │   ├── JobProgressBlock.tsx        6-step progress visualization
│   │   ├── JobTimelineSection.tsx      Check event timeline
│   │   ├── LocationBlock.tsx           Address + Navigate button
│   │   └── statusConfig.ts             Status → label / badge colours
│   ├── offline/
│   │   ├── types.ts                    OutboxItem union type (stub)
│   │   └── storage.ts                  AsyncStorage helpers (defined, never called)
│   ├── services/
│   │   └── outbox.ts                   OutboxService interface + stub impl (no real queue)
│   ├── types/
│   │   └── job.ts                      Parallel JobDetail interface (unused)
│   └── utils/
│       └── gps.ts                      GPS payload with __DEV__ bypass
```
