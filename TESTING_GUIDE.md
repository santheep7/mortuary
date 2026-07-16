# Testing Guide — for Sandeep

This branch (`integrate/multitenancy-to-main`) has everyone's work combined into one
system: your cookie login + password reset work, and Anas's multi-hospital
(SuperAdmin) work. Your job right now: get this running on your laptop, click
through it like a real user, and report anything broken.

---

## 1. Get the code

You already have this repo cloned from before. You just need to grab this
specific branch.

```bash
cd path/to/mortuary-main
git fetch origin
git checkout integrate/multitenancy-to-main
git pull
```

If `git checkout` complains about local changes you don't want to lose, run
`git stash` first, then repeat the two commands above. (Ask Anas before
deleting anything you're not sure about — `git stash` just tucks it aside
safely, it doesn't throw it away.)

## 2. Install dependencies (in both folders)

A few new packages were added since you last worked on this, so re-run
install in both places even if you did it before:

```bash
cd server
npm install

cd ../client
npm install
```

## 3. Environment file (`.env`)

You should already have a working `server/.env` from your own earlier work
on this project (same shared database, same JWT secret) — you don't need to
recreate it. If you ever do need to rebuild it, `server/.env.example` shows
the shape:

```
PG_HOST=...
PG_PORT=5432
PG_USER=...
PG_PASSWORD=...
PG_DATABASE=...
PORT=3001
JWT_SECRET=...
```

Don't have one, or unsure? Ping Anas or Rohan for the real values — never
commit this file, it's already in `.gitignore`.

## 4. Start it up

Two terminals, one for each:

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

The first time it starts, the server prints a bunch of `Migration: added...`
lines — that's normal, it's just updating the database structure to match
the new code. Wait for `Mortuary Management System running on port 3001`
before opening the app.

Open **http://localhost:3000** in your browser.

## 5. Accounts to test with

| Role | Where | Username | Notes |
|---|---|---|---|
| SuperAdmin | `/superadmin-login` | `superadmin` | password: `superadmin123` |
| Admin (MOSC) | `/admin-login` | ask Anas | existing MOSC hospital |
| Staff (MOSC) | `/` (main page) | ask Anas | existing MOSC hospital |

You can also **register a brand-new staff account yourself** at `/` → "Sign
up" — you'll need a **Client ID**. Log in as SuperAdmin first, look at the
Hospitals list, and use whichever hospital's Client ID you want to test
with (or ask Anas which one to use).

---

## What changed since you last saw this system

- **Login/signup page** — this is your redesign, now wired to the real
  multi-hospital system. Typing a Client ID (signup) or Employee ID (login)
  should show that hospital's own logo, live, as you type.
- **Multiple hospitals exist now** — SuperAdmin can onboard a hospital with
  its own name, logo, pricing, and Client ID. Every hospital's data (bodies,
  cabins, billing, staff) is completely separate from every other
  hospital's.
- **Password reset** — your feature, unchanged in behavior, just double-check
  it still works end to end.
- **Sidebar/dashboard branding** — now shows the logged-in user's own
  hospital name and logo, not always "MOSC."

## Testing checklist

Go through this like a real user would, not just clicking randomly. For
each item, the goal is: does it work, and does anything look/feel broken?

### As SuperAdmin
- [ ] Log in, dashboard loads with hospital list
- [ ] "Add Hospital" — create a test hospital, try each pricing model
      (tiered/flat-daily/free), upload a logo
- [ ] Edit an existing hospital (change pricing, don't lose the logo)
- [ ] Add/delete an Admin account

### As Admin
- [ ] Log in, dashboard shows correct hospital name
- [ ] User Approvals — approve/reject a pending staff registration
- [ ] Password reset — view requests, reset a staff member's password
- [ ] Billing Settings — view/update pricing

### As Staff (do this for **two different hospitals** if you can — this is the important one)
- [ ] Register a new account using a hospital's Client ID — confirm the
      right logo shows up as you type it
- [ ] Log in — confirm sidebar/header show *that hospital's* name and logo,
      not MOSC's
- [ ] Body Registration → Cabin Allocation → Billing → Body Release, full
      cycle
- [ ] Confirm you can't see or affect the *other* hospital's data anywhere
- [ ] Forgot password flow

### General
- [ ] Resize the browser window / test on a smaller screen
- [ ] Log out and back in a few times
- [ ] Anything that gives a blank page, a stuck spinner, or a raw error
      message instead of a friendly one

## How to report something broken

For each bug, tell Anas:
1. **What you did** (exact steps, which account/role)
2. **What you expected**
3. **What actually happened** (screenshot if it's visual)
4. Anything in the browser console (press F12 → Console tab) if it's a
   blank page or something not loading

Quick "everything's fine" or "found stuff" is fine too — doesn't need to be
formal, just enough that we can reproduce it.
