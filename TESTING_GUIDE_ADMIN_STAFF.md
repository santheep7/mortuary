# Testing Guide — Admin & Staff Dashboard Fixes

This branch (`admin-staff-dashboard-fixes`) is everything from today's audit
pass on the Admin Dashboard and M Staff modules. It's branched off the same
code everyone's already been testing, plus these specific fixes on top.

If you pull this and it looks good, merge it — this is a focused,
already-verified batch, not a work-in-progress.

## Get the code

```bash
git fetch origin
git checkout admin-staff-dashboard-fixes
git pull
```

Same setup as before (`.env`, `npm install` in both `server/` and
`client/`, `npm run dev` in both) — nothing new needed to run it.

## What's actually new in this branch — test these specifically

### Admin Dashboard (`/dashboard/admin`)
- [ ] Header logo (next to "Admin Dashboard" title) now loads correctly —
      was showing a broken image icon before.
- [ ] The 8 stat tiles at the top (Total Bodies, Active Stay, etc.) are now
      clickable — each should navigate somewhere relevant (e.g. "Pending
      Bills" → Billing).
- [ ] Forms (Add Co-Admin, Reset Password) should look clean and readable
      even if your system/browser is set to dark mode — was previously
      near-unreadable (dark input boxes, invisible text) in dark mode.
- [ ] Clicking the sidebar logo/hospital name (top-left) now takes you back
      to the Admin Dashboard from anywhere.
- [ ] URLs changed: Admin pages now live under `/dashboard/admin/*`
      (e.g. `/dashboard/admin/user-approvals`) instead of the old flat
      `/dashboard/user-approvals`. If you had anything bookmarked with the
      old URLs, they won't work anymore — that's expected.
- [ ] "Sync Live Data" button now shows a spinner and disables itself while
      refreshing, instead of giving no feedback.

### M Staff
- [ ] Logging in as Staff now lands directly on **Body Registration** —
      the old 8-card dashboard screen is gone entirely (Staff never needed
      it, that was Admin's pattern showing up here by mistake).
- [ ] Sidebar for Staff should show: Body Registration, Cabin Allocation,
      Body Release, Billing, Release History, Housekeeping — no
      "Dashboard" item.

### Small fixes, but check these — they affect real daily use
- [ ] **Login page**: typing your Employee ID no longer force-uppercases
      it as you type. Type it in whatever case feels natural — login still
      works the same either way.
- [ ] **Body Registration form → Time of Death**: now three dropdowns
      (Hour / Minute / AM-PM) instead of one time box — make sure AM/PM is
      clearly visible and picking a time works correctly.
- [ ] **Cabin Allocation → Advance Collection field**: as Staff, this
      field should now be grayed out / read-only, labeled "(set by
      Admin)". As Admin, it should still be editable normally. Staff
      should NOT be able to change this value at all anymore.
- [ ] **Sidebar hospital name** (top-left, under the logo) — if it's a
      long name and gets cut off with "...", hover over it — you should
      see the full name as a tooltip now.

### Security (background context, not something you'll see directly)
- CORS was tightened (was fully open before) and a related admin
  registration gap Sandeep and I discussed was already closed in an
  earlier branch. Nothing to click-test here, just flagging it's been
  looked at since Rohan asked.

## How to report something broken

Same as before — what you did, what you expected, what actually happened,
and anything in the browser console (F12 → Console) if something's blank
or not loading.
