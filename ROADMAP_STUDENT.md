# Student-Facing App — Full Build Roadmap

## Overview

The student side of the app does not exist yet. The root page (`/`) is the Next.js starter template. All existing pages are admin-only (`/admin/*`). This document covers everything needed to build the complete student experience.

---

## 1. AUTHENTICATION

### Student Login (`/login`)
- New page at `app/login/page.tsx`
- Pattern: mirror `app/admin-login/page.tsx` but call `POST /api/v1/auth/login` (student endpoint, not faculty)
- On success: store `access_token` + `refresh_token` cookies, redirect to `/dashboard`
- Separate URL from admin login to avoid confusion

### Student Registration (`/register`)
- New page at `app/register/page.tsx`
- Form: email, password, first name, last name, student ID, course (dropdown), year level
- Calls `POST /api/v1/auth/register`
- On success: auto-login and redirect to `/dashboard`

### Auth Check
- Student layout checks for `access_token` cookie (same as admin layout)
- Redirects to `/login` if not authenticated
- Token decoded role should be `student` (reject if `faculty` tries to access student pages)

---

## 2. LAYOUT & NAVIGATION

### Student Layout (`app/(student)/layout.tsx`)
- Create as route group `(student)` so all student pages share a clean path prefix
- Mobile-first, minimal design
- **Top navbar** (no sidebar — students don't need complex navigation):
  - Logo/brand
  - Nav links: Dashboard, Events, Announcements, Balances, More (dropdown)
  - Profile icon (QR code, logout)
- Responsive: bottom tab bar on mobile, top nav on desktop

### Page structure under `app/(student)/`:
```
app/(student)/
  layout.tsx          ← StudentLayout (auth check + navbar)
  page.tsx            ← Dashboard / Home
  attendance/
    page.tsx          ← Attendance history
  events/
    page.tsx          ← Events list
  announcements/
    page.tsx          ← Announcements list
  balances/
    page.tsx          ← Balances + receipt submission
  disputes/
    page.tsx          ← File and track disputes
  feedback/
    page.tsx          ← Submit and view feedback
  sanctions/
    page.tsx          ← Rules + personal sanction status
  documents/
    page.tsx          ← View/download audit files
  profile/
    page.tsx          ← QR code + account info
```

---

## 3. PAGES — DETAILED

### 3.1 Dashboard (`/dashboard`)
**API:** combination of `GET /attendance/history`, `GET /attendance/sanctions`, `GET /events?limit=5`, `GET /announcements?limit=5`
- Welcome message with student name
- **Stat cards:** Total events attended, upcoming events, active sanctions, outstanding balance
- **Recent attendance** (last 5 records): date, event, status badge
- **Upcoming events** (next 5): date, title, venue, time
- **Unread announcements** count + latest 3
- **Current sanction status** (if any active sanction, show warning banner)

### 3.2 Attendance History (`/attendance`)
**API:** `GET /attendance/history`
- Table: date | event | venue | status (Present/Late/Absent badge) | scanned at
- Filter by event (dropdown) or status
- Pagination

### 3.3 Events (`/events`)
**API:** `GET /events`
- Card grid layout (not table — more visual for events)
- Each card: date, title, venue, time, mandatory badge, attendance count
- Past events are dimmed; upcoming events highlighted
- Click → detail view/modal with full description, important notice, cover photo

### 3.4 Announcements (`/announcements`)
**API:** `GET /announcements`, `POST /announcements/:id/read`
- List: title, date, author, course badge, read/unread indicator
- Click → full content + mark as read
- Search by title
- Attachments with download (signed URL)

### 3.5 Balances (`/balances`)
**API:** `GET /balances`, `POST /api/v1/payments/receipts` (new), `GET /payments/my-receipts` (new)
- **Tab 1: My Balances**
  - Table: description | amount | due date | status (Unpaid/Partial/Paid) | amount paid
  - "Pay" button on unpaid/partial rows → opens receipt submission dialog
- **Tab 2: Payment History**
  - Table: date | balance | amount | reference | method | status (Pending/Approved/Rejected)
  - Shows rejection reason if rejected
- **Receipt submission dialog:**
  1. Select balance (dropdown of unpaid/partial)
  2. Select payment method (dropdown)
  3. Amount input
  4. Reference number input (optional)
  5. Upload receipt file (image or PDF, max 10MB)
  6. Submit → shows as "Pending" in Payment History

### 3.6 Disputes (`/disputes`)
**API:** `GET /disputes`, `POST /disputes`
- **Active disputes:** table with date, event, reason, status (Pending/Approved/Rejected), faculty notes
- **File a dispute** button → dialog:
  1. Select attendance record (dropdown of their Absent records)
  2. Enter reason
  3. Submit

### 3.7 Feedback (`/feedback`)
**API:** `GET /feedback`, `POST /feedback`
- **Submit feedback form:** subject, message, "submit anonymously" checkbox
- **History:** table with date, subject, message, response (if any), responded date

### 3.8 Sanctions (`/sanctions`)
**API:** `GET /attendance/sanctions`, `GET /sanctions/rules`
- **My status:** absence count, active sanction (level + triggered date or "None"), next threshold
- **Sanction rules table:** type | threshold | level | description — this is the escalation ladder (e.g., 3 absences → Warning)

### 3.9 Documents (`/documents`)
**API:** `GET /audit-files`, `GET /audit-files/download/:fileUrl`
- Table: title | category badge | course badge | size | uploaded by | date
- Click → preview/download (reuse existing fullscreen viewer pattern)
- Filter by category, search by title

### 3.10 Profile (`/profile`)
**API:** student data from their own record
- Display name, student ID, email, course, year level
- **QR Code:** render the student's `qrCodeToken` as a QR code image (for faculty to scan)
  - Library: `qrcode` npm package or QR code API
  - Large, centered, with "Show QR Code" button that opens fullscreen
- Logout button

---

## 4. NEW BACKEND ENDPOINTS NEEDED

| Endpoint | Method | Purpose | Priority |
|---|---|---|---|
| `/api/v1/students/me` | GET | Get authenticated student's own profile (name, course, year, qrCodeToken) | High |
| `/api/v1/students/me/qr-code` | GET | Get signed URL for QR code if stored as image, or return token | High |

**Payment Receipts (see PLAN_PAYMENT_RECEIPTS.md for full details):**
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/payments/receipts` | POST | Student submits receipt with file |
| `/api/v1/payments/my-receipts` | GET | Student lists own receipts |
| `/api/v1/payments/receipts` | GET | Admin lists all receipts |
| `/api/v1/payments/receipts/:id/approve` | PATCH | Admin approves |
| `/api/v1/payments/receipts/:id/reject` | PATCH | Admin rejects |

---

## 5. BUILD ORDER

| Phase | Scope | Estimated Pages |
|---|---|---|
| **Phase 1: Auth + Layout** | Student login page, registration page, student layout with navbar, auth check. Root `/` redirects to `/dashboard` if logged in, `/login` if not. | 3 files |
| **Phase 2: Dashboard + Profile** | Dashboard with stats + recent data. Profile page with QR code display + logout. Backend: `GET /students/me` endpoint. | 2 pages + 1 API |
| **Phase 3: Attendance + Events** | Attendance history page with filters. Events list with card grid + detail view. | 2 pages |
| **Phase 4: Announcements + Documents** | Announcements list with read tracking. Documents list with download. | 2 pages |
| **Phase 5: Balances + Receipts** | Balances display + payment receipt submission dialog + payment history. Full backend receipt flow. | 1 page + full backend module |
| **Phase 6: Disputes + Feedback + Sanctions** | File disputes, submit feedback, view sanction rules/status. | 3 pages |
| **Phase 7: Polish** | Error states, loading skeletons, empty states, responsive design, edge cases | — |

---

## 6. DESIGN PRINCIPLES

- **Mobile-first:** Students primarily use phones. All pages must work on small screens.
- **No sidebar:** Use top nav (desktop) / bottom tab bar (mobile) instead.
- **Reuse UI components:** All existing UI components (Badge, Button, DataTable, Dialog, Toast, SearchBar, Select, etc.) work and should be reused.
- **API client:** Reuse `apiClient.ts` — it already handles cookies and auth headers.
- **Consistent with admin styling:** Use same CSS variables, color tokens, spacing, typography.
