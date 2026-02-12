# UX Specification: Account & Billing Settings Pages

**Version:** 1.1
**Date:** 2026-02-12
**Product Context:** CleanProof
**Scope:** Application UI (Protected Routes)

---

## Changelog (v1.0 → v1.1)

**Tightened:**
- ✓ Access control: Billing page Staff → redirect to /settings
- ✓ Access control: Billing dropdown item hidden for Staff role
- ✓ Navigation: "Back to Settings" only on mobile/deeplink (desktop uses sidebar)
- ✓ Usage progress bars: ≤79% accent, 80-99% warning, 100%+ error

**Added:**
- ✓ Settings Home page (/settings) specification as hub
- ✓ Data ownership section (user-scope vs org-scope)
- ✓ MVP boundaries explicitly defined (v1.1 vs v1.2+)

**Moved to v1.2+:**
- ✓ Two-Factor Authentication (disabled placeholder or out of scope)
- ✓ Active Sessions management (out of scope for MVP)

**Clarified:**
- ✓ Password change only for password-auth users (SSO users: no password section)
- ✓ Manager billing access: read-only view, all CTAs hidden
- ✓ "Return to Settings" always navigates to /settings hub

---

## 0. SETTINGS HOME PAGE

### 0.1 Page Structure

**Route:** `/settings`

**Access Control:**
- All authenticated users (Owner, Manager, Staff)

**Purpose:** Central hub for all settings categories

**Page Header:**
```
┌─────────────────────────────────────────────────┐
│ Settings                                        │
│ Manage your account, billing, and preferences   │
└─────────────────────────────────────────────────┘
```

**Layout:**
- Max width: 1024px (centered)
- Grid: 2 columns on desktop, 1 column on mobile
- Card grid gap: 24px

---

### 0.2 Settings Tiles

**Structure:**
```
┌────────────────────┐  ┌────────────────────┐
│ [Icon] Account     │  │ [Icon] Billing     │
│ Profile and prefs  │  │ Subscription       │
│ →                  │  │ →                  │
└────────────────────┘  └────────────────────┘

┌────────────────────┐  ┌────────────────────┐
│ [Icon] Notifs      │  │ [Icon] Security    │
│ Email alerts       │  │ Password, 2FA      │
│ →                  │  │ →                  │
└────────────────────┘  └────────────────────┘
```

**Tile Components:**

1. **Account Settings Tile**
   - Icon: Settings (20px)
   - Title: "Account Settings"
   - Description: "Profile and preferences"
   - Link: `/settings/account`
   - Visible: All roles

2. **Billing Tile**
   - Icon: CreditCard (20px)
   - Title: "Billing"
   - Description: "Subscription and payment"
   - Link: `/settings/billing`
   - Visible: Owner, Manager (Staff: hidden)

3. **Notifications Tile**
   - Icon: Bell (20px)
   - Title: "Notifications"
   - Description: "Email alerts and preferences"
   - Link: `/settings/account#notifications` (scroll to section)
   - Visible: All roles

4. **Security Tile**
   - Icon: Shield (20px)
   - Title: "Security"
   - Description: "Password and authentication"
   - Link: `/settings/account#security` (scroll to section)
   - Visible: All roles (password-auth only)

**Tile Styling:**
```
Card:
- Background: --color-bg-card
- Border: --color-border-default
- Padding: 24px
- Hover: Border → --color-border-strong, translateY(-2px)
- Transition: 150ms ease

Icon:
- Size: 20px
- Color: --color-text-secondary

Title:
- Font: --font-size-app-heading (18px)
- Weight: --font-weight-semibold
- Color: --color-text-primary

Description:
- Font: --font-size-app-body (14px)
- Color: --color-text-tertiary

Arrow:
- Position: Bottom right
- Color: --color-text-tertiary
```

**Responsive Behavior:**
- Desktop (≥1024px): 2 columns
- Tablet (640-1023px): 2 columns
- Mobile (<640px): 1 column, full width

---

### 0.3 Role-Based Tile Visibility

| Tile | Owner | Manager | Staff |
|------|-------|---------|-------|
| Account Settings | ✓ | ✓ | ✓ |
| Billing | ✓ | ✓ Read-only | ✗ Hidden |
| Notifications | ✓ | ✓ | ✓ |
| Security | ✓ | ✓ | ✓ |

**Staff Users:**
- Billing tile not shown
- Clicking /settings/billing directly → redirect to /settings with toast "Billing access restricted to administrators"

**Password-Auth vs SSO:**
- SSO users: Security tile links to /settings/account but password section is hidden
- Password-auth users: Security tile shows password change section

---

## 1. ACCOUNT SETTINGS PAGE

### 1.1 Page Structure

**Route:** `/settings/account`

**Access Control:**
- All authenticated users (Owner, Manager, Staff)

**Page Header:**
```
┌─────────────────────────────────────────────────┐
│ [←] Settings                    [Mobile Only]   │
│                                                 │
│ [Settings Icon] Account Settings                │
│ Manage your profile and access preferences      │
└─────────────────────────────────────────────────┘
```

**Navigation Rules:**
- **Desktop:** No back link (sidebar visible for navigation)
- **Mobile (<1024px):** Show "← Settings" back link
- **Deep link:** If user lands directly on page, show back link
- **Back link destination:** Always `/settings` (hub page)

**Layout:**
- Max width: 1024px (centered)
- Vertical spacing: 32px between sections (`--app-section-gap`)
- Card padding: 24px (`--app-card-padding`)

---

### 1.2 Data Ownership

**Scope:** User-level settings

**Ownership:**
- All changes affect **current user only**
- No organization-wide impact
- User can modify own profile regardless of role

**Data:**
- Profile information (name, email, phone)
- Password (if password-auth)
- Notification preferences

**Organization Restrictions:**
- Email may be read-only if SSO enforced
- Security settings may be restricted by org policy

---

### 1.3 Section A: Profile Information

**Purpose:** Edit user identity and contact details

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ Profile Information                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Full name *                                     │
│ [Input: John Doe                             ]  │
│                                                 │
│ Email address                                   │
│ [Input: john@cleanproof.com (read-only)      ]  │
│ ℹ Email managed by your organization           │
│                                                 │
│ Phone number (optional)                         │
│ [Input: +971 50 123 4567                     ]  │
│                                                 │
│              [Cancel] [Save changes]            │
└─────────────────────────────────────────────────┘
```

**Fields:**

1. **Full name**
   - Type: Text input
   - Required: Yes
   - Validation: Min 2 characters, max 100 characters
   - Error: "Please enter your full name (at least 2 characters)"

2. **Email address**
   - Type: Text input
   - Required: Yes
   - Editable: Conditional
     - SSO users: Read-only (disabled state)
     - Password users: Editable
   - Validation: Valid email format
   - Error: "Please enter a valid email address"
   - Helper text (if read-only): "Email managed by your organization"

3. **Phone number**
   - Type: Tel input
   - Required: No
   - Validation: Valid phone format (E.164)
   - Placeholder: "+971 50 123 4567"
   - Error: "Please enter a valid phone number"

**Actions:**

- **Cancel button**
  - Variant: Secondary (outlined)
  - Behavior: Reset form to saved values
  - Confirmation: If dirty, show "Discard changes?" modal

- **Save changes button**
  - Variant: Primary (accent)
  - Behavior: Submit form, show loading state
  - Disabled: If form invalid or unchanged
  - Success: Show toast "Profile updated successfully"
  - Error: Show toast with error message

**States:**

1. **Default State**
   - All fields enabled (except email if SSO)
   - Save button disabled (if form clean)

2. **Loading State**
   - On page load: Skeleton placeholders for each field
   - On save: Save button shows spinner, fields disabled

3. **Success State**
   - Green toast notification: "✓ Profile updated successfully"
   - Toast duration: 3 seconds
   - Form marked as clean (Save button disabled)

4. **Error State**
   - Field-level: Red border, error text below input
   - Form-level: Red toast notification with error message
   - Submit button remains enabled (allow retry)

**Token Usage:**
- Card background: `--color-bg-card`
- Input background: `--color-bg-primary`
- Input border: `--color-border-default`
- Input border (error): `--color-error`
- Helper text: `--color-text-tertiary`
- Error text: `--color-error`
- Save button: `--accent-primary` (allowed for primary CTA)
- Cancel button: `--color-border-strong`, `--color-text-primary`

---

### 1.4 Section B: Password & Security

**Display Rules:**
- **Password-auth users:** Show password change form
- **SSO users:** Hide entire section OR show disabled placeholder

**Purpose:** Manage authentication credentials

**Structure (Password-auth only):**
```
┌─────────────────────────────────────────────────┐
│ Password & Security                             │
├─────────────────────────────────────────────────┤
│                                                 │
│ Change Password                                 │
│ Current password *                              │
│ [Input: ••••••••                             ]  │
│                                                 │
│ New password *                                  │
│ [Input: ••••••••                             ]  │
│ Password strength: [████░░░░] Weak             │
│                                                 │
│ Confirm new password *                          │
│ [Input: ••••••••                             ]  │
│                                                 │
│              [Cancel] [Update password]         │
└─────────────────────────────────────────────────┘
```

**Fields:**

1. **Current password**
   - Type: Password input
   - Required: Yes
   - Validation: Must match current password
   - Error: "Current password is incorrect"

2. **New password**
   - Type: Password input
   - Required: Yes
   - Validation:
     - Min 8 characters
     - Must contain: uppercase, lowercase, number, special char
   - Password strength indicator: Visual bar (weak/medium/strong)
   - Error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character"

3. **Confirm new password**
   - Type: Password input
   - Required: Yes
   - Validation: Must match new password
   - Error: "Passwords do not match"

**Password Strength Indicator:**
- Visual: Progress bar (4 segments)
- Colors:
  - Weak (1-2 segments): `--color-error`
  - Medium (3 segments): `--color-warning`
  - Strong (4 segments): `--color-success`
- Label: "Weak" / "Medium" / "Strong"

**Actions:**

- **Cancel button**
  - Variant: Secondary
  - Behavior: Clear password fields

- **Update password button**
  - Variant: Primary (accent)
  - Disabled: If fields empty or validation fails
  - Success: Show toast "✓ Password updated successfully", clear fields
  - Error: Show toast with error message

**SSO Users:**
- Entire section hidden
- Alternative: Show placeholder card
  ```
  ┌─────────────────────────────────────────────────┐
  │ Password & Security                             │
  ├─────────────────────────────────────────────────┤
  │ [Shield icon]                                   │
  │ Authentication managed by your organization     │
  │ Contact your IT administrator for help          │
  └─────────────────────────────────────────────────┘
  ```

---

### 1.5 Section C: Notifications

**Purpose:** Configure notification preferences

**Scope:** User-level (affects current user only)

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ Notifications                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Email Notifications                             │
│ Receive updates and alerts via email            │
│ [Toggle: On]                                    │
│                                                 │
│ Job Assignment Alerts                           │
│ Get notified when assigned to a new job         │
│ [Toggle: On]                                    │
│                                                 │
│ Weekly Summary                                  │
│ Receive a weekly summary of your activity       │
│ [Toggle: Off]                                   │
│                                                 │
│ Changes are saved automatically                 │
└─────────────────────────────────────────────────┘
```

**Notification Options:**

1. **Email Notifications (Master Toggle)**
   - Label: "Email Notifications"
   - Description: "Receive updates and alerts via email"
   - Default: On
   - Behavior: If off, disables all sub-toggles below

2. **Job Assignment Alerts**
   - Label: "Job Assignment Alerts"
   - Description: "Get notified when assigned to a new job"
   - Default: On
   - Dependency: Disabled if Email Notifications is off

3. **Weekly Summary**
   - Label: "Weekly Summary"
   - Description: "Receive a weekly summary of your activity"
   - Default: Off
   - Dependency: Disabled if Email Notifications is off

**Toggle Component Spec:**
- Type: Switch toggle
- States: On (accent), Off (neutral)
- Disabled state: Greyed out
- Interaction: Immediate save on toggle

**Auto-save Behavior:**
- Save triggers on toggle change
- Show brief loading indicator on toggle (spinner)
- Success: No toast (auto-save is implicit)
- Error: Show toast "Failed to save notification preferences" + revert toggle

**Helper Text:**
- Position: Below all toggles
- Text: "Changes are saved automatically"
- Color: `--color-text-tertiary`
- Font size: `--font-size-app-caption`

**Token Usage:**
- Toggle (off): `--color-border-default`, `--color-bg-muted`
- Toggle (on): `--accent-primary`, `--accent-on-primary`
- Toggle (disabled): `--color-text-disabled`, `--color-bg-tertiary`

---

### 1.6 MVP Scope: Account Settings (v1.1)

**INCLUDED in v1.1:**
- ✓ Profile Information (full name, email, phone)
- ✓ Password & Security (password change only, password-auth users)
- ✓ Notifications (basic toggles: master, job alerts, weekly summary)

**OUT OF SCOPE (v1.2+):**
- ✗ Two-Factor Authentication (disabled placeholder or removed entirely)
- ✗ Active Sessions management (removed from MVP)
- ✗ Advanced notification preferences (push notifications, SMS, etc.)
- ✗ Profile picture upload
- ✗ Timezone preferences

**Implementation Note:**
- If 2FA/Sessions sections are kept as placeholders, they must be clearly marked as "Coming in v1.2" or hidden entirely

---

### 1.7 Role-Based Logic: Account Settings

| Feature | Owner | Manager | Staff |
|---------|-------|---------|-------|
| Edit full name | ✓ | ✓ | ✓ |
| Edit email (if password auth) | ✓ | ✓ | ✓ |
| Edit email (if SSO) | ✗ Read-only | ✗ Read-only | ✗ Read-only |
| Edit phone | ✓ | ✓ | ✓ |
| Change password | ✓ | ✓ | ✓ |
| Manage notifications | ✓ | ✓ | ✓ |

**No role restrictions:** All users have equal access to their own account settings.

---

## 2. BILLING PAGE

### 2.1 Page Structure

**Route:** `/settings/billing`

**Access Control:**
- **Owner:** Full access (read + write)
- **Manager:** Read-only view (all CTAs hidden)
- **Staff:** Redirect to `/settings` with toast "Billing access restricted to administrators"

**Page Header:**
```
┌─────────────────────────────────────────────────┐
│ [←] Settings                    [Mobile Only]   │
│                                                 │
│ [CreditCard Icon] Billing                       │
│ Manage your subscription and payment methods    │
└─────────────────────────────────────────────────┘
```

**Navigation Rules:**
- **Desktop:** No back link (sidebar visible)
- **Mobile (<1024px):** Show "← Settings" back link
- **Back link destination:** Always `/settings`

**Manager Banner (Read-only view):**
```
┌─────────────────────────────────────────────────┐
│ ℹ Billing management restricted to account      │
│   owner. You have read-only access.             │
└─────────────────────────────────────────────────┘
```
- Position: Below page header
- Background: `--color-info-bg`
- Border: `--color-info`
- Icon: Info icon
- Visible: Manager role only

**Layout:**
- Max width: 1024px (centered)
- Vertical spacing: 32px between sections
- Card padding: 24px

---

### 2.2 Data Ownership

**Scope:** Organization-level settings

**Ownership:**
- Billing settings affect **entire organization**
- Only Owner role can modify billing
- Manager can view for transparency
- Staff has no access

**Data:**
- Subscription plan
- Payment methods
- Invoices
- Usage metrics (org-wide)

**Critical Rule:**
- Changes to billing affect all users in organization
- Owner approval required for all modifications

---

### 2.3 Section A: Current Plan Card

**Purpose:** Display subscription status and plan management

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ Current Plan                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Pro Plan badge]                                │
│                                                 │
│ Status: Active                                  │
│ Next billing date: March 15, 2026              │
│                                                 │
│              [Upgrade plan] or [Manage plan]    │
│              [Owner only]                       │
└─────────────────────────────────────────────────┘
```

**Plan Status Variants:**

1. **Trial**
   - Badge: "Trial" (info badge)
   - Status: "Trial active"
   - Next billing: "Trial ends: [date]"
   - CTA: [Upgrade plan] (Owner only)

2. **Active**
   - Badge: Plan name (e.g., "Pro Plan")
   - Status: "Active" (success badge)
   - Next billing: "Next billing date: [date]"
   - CTA: [Manage plan] (Owner only)

3. **Past Due**
   - Badge: Plan name
   - Status: "Past due" (error badge)
   - Next billing: "Payment failed on [date]"
   - CTA: [Update payment method] (Owner only)

4. **Cancelled**
   - Badge: Plan name
   - Status: "Cancelled" (warning badge)
   - Next billing: "Access ends: [date]"
   - CTA: [Renew subscription] (Owner only)

**Status Badges:**
- Trial: `--color-info-bg`, `--color-info`
- Active: `--color-status-completed-bg`, `--color-status-completed`
- Past due: `--color-status-failed-bg`, `--color-status-failed`
- Cancelled: `--color-status-flagged-bg`, `--color-status-flagged`

**Critical Rule:**
- Status badges must ONLY use semantic colors (NOT accent)

**CTA Buttons:**
- Upgrade plan: Primary (accent) - allowed for conversion action
- Manage plan: Secondary (outlined, neutral)
- Update payment method: Primary (accent) - urgent action
- Renew subscription: Primary (accent) - conversion action

**Role-Based Display:**
- **Owner:** All buttons visible and enabled
- **Manager:** All buttons hidden (read-only view)

---

### 2.4 Section B: Usage Summary

**Purpose:** Show current usage against plan limits

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ Usage Summary                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Active Users                                    │
│ [████████░░] 8 of 10 users                      │
│                                                 │
│ Locations                                       │
│ [████░░░░░░] 12 of 30 locations                 │
│                                                 │
│ Job Volume (Current Month)                      │
│ [███████░░░] 145 of 200 jobs                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Usage Metrics:**

1. **Active Users**
   - Current: Number of active users
   - Limit: Plan limit
   - Progress bar: Percentage of limit used
   - Helper text: "X more users available"

2. **Locations**
   - Current: Number of active locations
   - Limit: Plan limit
   - Progress bar: Percentage of limit used
   - Helper text: "X locations remaining"

3. **Job Volume (Current Month)**
   - Current: Jobs created this month
   - Limit: Monthly job limit
   - Progress bar: Percentage of limit used
   - Helper text: "Resets on [first of next month]"

**Progress Bar Color Rules:**

| Usage % | Color Token | Rule |
|---------|-------------|------|
| 0-79% | `--accent-primary` | Accent allowed (informational) |
| 80-99% | `--color-warning` | Semantic warning |
| 100%+ | `--color-error` | Semantic error |

**Visual Structure:**
```
Label
[████████░░] X of Y units
Helper text
```

**Helper Text Examples:**
- Low usage: "2 more users available"
- Medium usage: "18 locations remaining"
- High usage: "⚠ Approaching limit"
- At limit: "❌ Limit reached"
- Over limit: "❌ Over limit by X"

**Empty State:**
- If no limits: "Unlimited plan"
- No progress bars shown

**Token Usage:**
- Progress bar (0-79%): `--accent-primary` (fill), `--color-bg-muted` (background)
- Progress bar (80-99%): `--color-warning` (fill)
- Progress bar (100%+): `--color-error` (fill)
- Helper text: `--color-text-tertiary`
- Warning text: `--color-warning`
- Error text: `--color-error`

---

### 2.5 Section C: Payment Method

**Purpose:** Display and manage payment methods

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ Payment Method                                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Visa icon] Visa ending in 4242                 │
│ Expires 12/2026                                 │
│                                                 │
│              [Change payment method]            │
│              [Owner only]                       │
└─────────────────────────────────────────────────┘
```

**Card Display:**
- Card type icon: Visa / Mastercard / Amex / Generic
- Label: "[Type] ending in [last 4 digits]"
- Expiry: "Expires MM/YYYY"

**States:**

1. **Default State** (Card on file)
   - Show card type, last 4, expiry
   - Button: "Change payment method" (Owner only)

2. **No Card State**
   - Icon: CreditCard (generic)
   - Message: "No payment method on file"
   - Button: "Add payment method" (Owner only, primary, accent)

3. **Card Expiring Soon**
   - If expiry < 30 days: Warning badge
   - Message: "⚠ Card expiring soon"
   - Button: "Update payment method" (Owner only, accent)

4. **Card Expired**
   - Error badge: "Expired"
   - Message: "Payment method expired"
   - Button: "Update payment method" (Owner only, accent, urgent)

**Actions:**

- **Change/Add payment method button**
  - Variant: Secondary (outlined)
  - Behavior: Open payment method modal or redirect to payment flow
  - Visible: Owner only

**Role-Based Display:**
- **Owner:** Button visible and enabled
- **Manager:** Button hidden

**Token Usage:**
- Card icon: `--color-text-secondary`
- Expiry text: `--color-text-tertiary`
- Warning badge: `--color-status-flagged-bg`, `--color-status-flagged`
- Error badge: `--color-status-failed-bg`, `--color-status-failed`

---

### 2.6 Section D: Invoices Table

**Purpose:** Display billing history with download option

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ Invoices                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Date        Amount    Status       Download     │
│ ───────────────────────────────────────────────│
│ Feb 1 2026  $199.00   Paid         [↓]         │
│ Jan 1 2026  $199.00   Paid         [↓]         │
│ Dec 1 2025  $199.00   Failed       [↓]         │
│                                                 │
│ [Load more]                                     │
└─────────────────────────────────────────────────┘
```

**Table Columns:**

1. **Date**
   - Format: "MMM D YYYY"
   - Example: "Feb 1 2026"
   - Sort: Descending (newest first)

2. **Amount**
   - Format: "$XXX.XX" (currency symbol based on org)
   - Right-aligned
   - Font variant: Tabular numbers

3. **Status**
   - Badge component
   - Variants:
     - Paid: Success badge (`--color-status-completed-bg`)
     - Failed: Error badge (`--color-status-failed-bg`)
     - Pending: Info badge (`--color-info-bg`)
     - Refunded: Warning badge (`--color-status-flagged-bg`)

4. **Download**
   - Icon button: Download icon
   - Action: Download PDF invoice
   - Tooltip: "Download invoice"
   - Loading state: Spinner replaces icon
   - Visible: Owner and Manager

**Table Behavior:**

- **Pagination:**
  - Show 10 invoices per page
  - "Load more" button at bottom
  - Loading state: Button shows spinner

- **Download Action:**
  - Click download icon
  - Show loading spinner
  - Download PDF file
  - Success: Brief toast "Invoice downloaded"
  - Error: Toast "Failed to download invoice"

**Empty State:**
```
┌─────────────────────────────────────────────────┐
│ Invoices                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│         [Invoice icon]                          │
│         No invoices yet                         │
│         You'll see your billing history here    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Empty State Components:**
- Icon: Invoice/document icon (64px, muted)
- Title: "No invoices yet"
- Description: "You'll see your billing history here"

**Token Usage:**
- Table header: `--color-text-secondary`, uppercase, small caps
- Table cell: `--color-text-primary`
- Table border: `--color-border-subtle`
- Status badges: Semantic colors only (NOT accent)
- Download icon: `--color-text-secondary`, hover: `--color-text-primary`

---

### 2.7 MVP Scope: Billing (v1.1)

**INCLUDED in v1.1:**
- ✓ Current Plan card (status display)
- ✓ Usage Summary (progress bars with semantic color rules)
- ✓ Payment Method display (card info, no update flow)
- ✓ Invoices table with download (PDF)
- ✓ Role-based access (Owner full, Manager read-only, Staff redirect)

**OUT OF SCOPE (v1.2+):**
- ✗ Inline plan upgrade flow (external link only)
- ✗ Payment method update in-page (modal or external)
- ✗ Invoice filtering/search
- ✗ Usage alerts/notifications
- ✗ Multi-currency support
- ✗ Payment history analytics

---

### 2.8 Role-Based Logic: Billing

| Feature | Owner | Manager | Staff |
|---------|-------|---------|-------|
| Access page | ✓ Full | ✓ Read-only | ✗ Redirect |
| View current plan | ✓ | ✓ | ✗ |
| Upgrade/Manage plan | ✓ | ✗ Hidden | ✗ |
| View usage summary | ✓ | ✓ | ✗ |
| View payment method | ✓ | ✓ | ✗ |
| Change payment method | ✓ | ✗ Hidden | ✗ |
| View invoices | ✓ | ✓ | ✗ |
| Download invoices | ✓ | ✓ | ✗ |

**Manager View:**
- Info banner at top: "Billing management restricted to account owner. You have read-only access."
- All CTA buttons hidden
- All data visible (transparency)

**Staff Redirect:**
- Attempt to access `/settings/billing` → redirect to `/settings`
- Toast message: "Billing access restricted to administrators"
- Billing tile hidden in Settings Home
- Billing option hidden in AccountDropdown

---

## 3. COMPONENT LIST

### 3.1 Settings Home Components

| Component | Type | Usage |
|-----------|------|-------|
| Page header | Standard | Title, subtitle |
| Settings tile | Card | Clickable navigation tile |
| Grid layout | Layout | 2-column responsive grid |

### 3.2 Account Settings Components

| Component | Type | Usage |
|-----------|------|-------|
| Page header | Standard | Title, subtitle, back link (mobile) |
| Profile form | Form group | Name, email, phone inputs |
| Input field | Text input | All text entries |
| Button | Primary/Secondary | Save, cancel actions |
| Password strength | Progress bar | Visual strength indicator |
| Toggle switch | Switch | Notification preferences |
| Toast | Notification | Success/error feedback |
| Skeleton loader | Loading state | Initial page load |

### 3.3 Billing Components

| Component | Type | Usage |
|-----------|------|-------|
| Page header | Standard | Title, subtitle, back link (mobile) |
| Info banner | Banner | Manager read-only message |
| Plan card | Card | Current plan display |
| Status badge | Badge | Plan status, invoice status |
| Progress bar | Visual indicator | Usage metrics |
| Payment card display | Card | Payment method info |
| Data table | Table | Invoice history |
| Icon button | Button | Download action |
| Empty state | Placeholder | No invoices state |

---

## 4. TOKEN USAGE NOTES

### 4.1 Colors

**Neutral Shell (Always):**
- Page background: `--color-bg-primary`
- Card background: `--color-bg-card`
- Border: `--color-border-default`
- Text primary: `--color-text-primary`
- Text secondary: `--color-text-secondary`
- Text tertiary: `--color-text-tertiary`

**Accent (Allowed):**
- Primary CTA buttons: `--accent-primary`, `--accent-on-primary`
- Toggle switch (on): `--accent-primary`
- Progress bars (0-79% usage): `--accent-primary`
- Focus states: `--accent-primary`

**Semantic (Status only):**
- Success: `--color-status-completed`, `--color-status-completed-bg`
- Error: `--color-status-failed`, `--color-status-failed-bg`
- Warning: `--color-status-flagged`, `--color-status-flagged-bg`
- Info: `--color-info`, `--color-info-bg`
- Progress bar warning (80-99%): `--color-warning`
- Progress bar error (100%+): `--color-error`

**Forbidden:**
- Status badges using accent: ❌
- Progress bars (status-based) using accent when warning/error: ❌

### 4.2 Spacing

**App Tokens Only:**
- Section gap: `--app-section-gap` (32px)
- Card padding: `--app-card-padding` (24px)
- Form gap: `--app-form-gap` (24px)
- Table cell padding: `--app-table-cell-padding-y`, `--app-table-cell-padding-x`

**Forbidden:**
- Landing tokens (`--landing-*`): ❌

### 4.3 Typography

**App Scale:**
- Page title: `--font-size-app-title` (24px)
- Section heading: `--font-size-app-heading` (18px)
- Body text: `--font-size-app-body` (14px)
- Caption: `--font-size-app-caption` (12px)
- Label: `--font-size-app-label` (13px)

**Forbidden:**
- Landing typography (`--font-size-h1` etc.): ❌

---

## 5. STATE SPECIFICATIONS

### 5.1 Global States

**Loading State:**
- Skeleton placeholders for all content
- Shimmer animation on skeletons
- Loading spinners on buttons
- Duration: Until data loaded

**Empty State:**
- Centered icon (64px, muted)
- Title (18px, semibold)
- Description (14px, secondary text)
- Optional CTA button
- Minimum height: 400px

**Error State:**
- Error icon or illustration
- Error title: "Something went wrong"
- Error message: Specific error text
- Retry button (secondary)
- Back to previous page link

**Success State:**
- Toast notification (green)
- Checkmark icon
- Success message
- Auto-dismiss: 3 seconds

### 5.2 Form States

**Default:**
- All fields enabled
- Save button disabled (if form clean)

**Dirty:**
- Form has unsaved changes
- Save button enabled (if valid)
- Leaving page: "Unsaved changes" warning

**Submitting:**
- Submit button: Loading spinner
- All fields disabled
- No user interaction allowed

**Validation Error:**
- Field-level: Red border, error text
- Form-level: Error toast
- Submit button remains enabled (retry)

**Success:**
- Success toast
- Form marked as clean
- Fields remain enabled for further edits

---

## 6. ACCESSIBILITY REQUIREMENTS

### 6.1 Keyboard Navigation

- Tab: Navigate between form fields and tiles
- Enter: Submit forms, activate tiles
- Escape: Close modals, cancel actions
- Space: Toggle switches

### 6.2 ARIA Labels

**Form Fields:**
- All inputs have `<label>` or `aria-label`
- Required fields: `aria-required="true"`
- Error fields: `aria-invalid="true"`, `aria-describedby="error-id"`

**Buttons:**
- Icon buttons: `aria-label` describing action
- Loading buttons: `aria-busy="true"`

**Toggle Switches:**
- `role="switch"`
- `aria-checked="true|false"`

**Tables:**
- `role="table"`, `role="row"`, `role="cell"`
- Column headers: `scope="col"`

**Tiles:**
- Clickable cards: `role="link"` or use `<a>` tag
- Keyboard accessible

### 6.3 Focus States

- All interactive elements: Visible focus ring
- Focus ring: 2px solid `--accent-primary`
- Focus ring offset: 2px

### 6.4 Screen Reader Support

- Skip links for main content
- Descriptive link text (no "click here")
- Form validation announced
- Success/error messages announced via `role="alert"`

---

## 7. RESPONSIVE BEHAVIOR

### 7.1 Desktop (≥1024px)

- Settings Home: 2-column grid
- Account/Billing: Max width 1024px (centered)
- No back links (sidebar navigation)
- Full table view

### 7.2 Tablet (640px - 1023px)

- Settings Home: 2-column grid
- Account/Billing: Single column
- Back link visible
- Reduced padding: 16px
- Table: Horizontal scroll

### 7.3 Mobile (<640px)

- Settings Home: 1-column grid
- Account/Billing: Single column
- Back link visible
- Minimum padding: 16px
- Buttons: Full width
- Table: Card view (stacked)
- Form fields: Full width
- Modals: Full screen

---

## 8. VALIDATION RULES

### 8.1 Profile Information

- **Full name:**
  - Min: 2 characters
  - Max: 100 characters
  - Pattern: Letters, spaces, hyphens, apostrophes

- **Email:**
  - Pattern: Valid email format (RFC 5322)
  - Lowercase only
  - Max: 254 characters

- **Phone:**
  - Pattern: E.164 format
  - Min: 10 digits
  - Max: 15 digits

### 8.2 Password

- **Current password:**
  - Required for password change
  - Min: 1 character (any)

- **New password:**
  - Min: 8 characters
  - Must contain:
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character (!@#$%^&*)

- **Confirm password:**
  - Must match new password exactly

---

## 9. ERROR MESSAGES

### 9.1 Field-Level Errors

| Field | Error Condition | Message |
|-------|----------------|---------|
| Full name | Empty | "Please enter your full name" |
| Full name | Too short | "Name must be at least 2 characters" |
| Email | Empty | "Please enter your email address" |
| Email | Invalid format | "Please enter a valid email address" |
| Phone | Invalid format | "Please enter a valid phone number" |
| Current password | Incorrect | "Current password is incorrect" |
| New password | Too weak | "Password must be at least 8 characters with uppercase, lowercase, number, and special character" |
| Confirm password | Mismatch | "Passwords do not match" |

### 9.2 Form-Level Errors

| Scenario | Toast Message |
|----------|---------------|
| Save profile failed | "Failed to update profile. Please try again." |
| Password update failed | "Failed to update password. Please try again." |
| Network error | "Network error. Please check your connection." |
| Notification save failed | "Failed to save notification preferences. Please try again." |

### 9.3 Access Control Errors

| Scenario | Toast Message |
|----------|---------------|
| Staff accesses billing | "Billing access restricted to administrators" |
| Non-owner modifies billing | "Only account owner can modify billing settings" |

---

## 10. NAVIGATION FLOW

### 10.1 Entry Points

**From Sidebar:**
- Click "Settings" → `/settings` (hub page)
- From hub: Click tiles → specific pages

**From AccountDropdown:**
- Click "Account settings" → `/settings/account`
- Click "Billing" → `/settings/billing` (Owner/Manager only)

**Direct URL:**
- User navigates directly to `/settings/account` or `/settings/billing`
- Show back link (mobile/deep link)

### 10.2 Return Navigation

**"Return to Settings" / "Back to Settings":**
- Always navigates to `/settings` (hub page)
- Desktop: Hidden (use sidebar)
- Mobile: Visible as back link

**Breadcrumb (optional v1.2+):**
- Settings > Account Settings
- Settings > Billing
- Clickable breadcrumb links

---

## 11. IMPLEMENTATION PRIORITIES

### Phase 1: MVP (v1.1 — Required)

**Settings Home:**
- ✓ Hub page with 4 tiles
- ✓ Role-based tile visibility (Billing hidden for Staff)
- ✓ Navigation to Account/Billing pages

**Account Settings:**
- ✓ Profile Information section (full name, email, phone)
- ✓ Password & Security section (password change only, password-auth users)
- ✓ Notifications section (basic toggles)
- ✓ Form validation
- ✓ Success/error states

**Billing:**
- ✓ Current Plan card
- ✓ Usage Summary section (progress bars with semantic color rules)
- ✓ Payment Method display
- ✓ Invoices table with download
- ✓ Role-based access control (Owner full, Manager read-only, Staff redirect)

### Phase 2: Enhanced (v1.2+ — Future)

**Account Settings:**
- Two-Factor Authentication (functional)
- Active Sessions management (real-time)
- Advanced notification preferences (push, SMS)
- Profile picture upload
- Timezone preferences

**Billing:**
- Inline plan upgrade flow
- Payment method update in-page
- Invoice filtering/search
- Usage alerts
- Multi-currency support
- Payment history analytics

---

## 12. NOTES

### Design System Compliance

- ✓ No raw hex colors
- ✓ No landing tokens in app UI
- ✓ Accent only on primary CTAs and informational elements (0-79% usage)
- ✓ Status badges use semantic colors only
- ✓ Progress bars: ≤79% accent, 80-99% warning, 100%+ error
- ✓ All spacing uses app tokens
- ✓ Typography uses app scale

### MVP Boundaries (v1.1)

**IN SCOPE:**
- Settings hub page
- Profile editing (name, email, phone)
- Password change (password-auth only)
- Basic notifications (3 toggles)
- Billing display (Owner full, Manager read-only)
- Usage metrics with semantic color rules
- Invoice download

**OUT OF SCOPE:**
- 2FA implementation
- Sessions management
- Advanced notifications
- Payment processing flows
- Plan upgrade flows (link to external)

### Future Enhancements (v1.2+)

- Multi-currency support for billing
- Invoice export (CSV)
- Payment history analytics
- Automated low-balance alerts
- Advanced security audit logs
- Profile picture upload
- Timezone preferences
- Push notification preferences
- SMS notification preferences

### Out of Scope (All Versions)

- Payment processor integration (Stripe/etc) — external
- Email delivery system — backend
- Org-level security policies UI — separate admin panel
- User management (add/remove users) — separate admin panel

---

**End of UX Specification v1.1**
