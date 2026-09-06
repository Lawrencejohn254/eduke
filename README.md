# EduKe — School Management System (MVP)

A full-stack school management system for Kenyan primary and secondary schools, built with **Next.js 16 (App Router) + Supabase**.

This is the MVP milestone: 3 core roles (Principal, Teacher/HOD, Parent), the core data model, and the flagship **AI Teaching Assistant** (lesson plans, schemes of work, exam questions — CBC & 8-4-4 aware). Fee payments (Pesapal/M-Pesa), SMS (Africa's Talking), and the AI assistant all run in **demo/mock mode out of the box** — no API keys required to try it.

---

## 1. What's included

- **Auth & roles**: Supabase Auth + RLS, 3 working portals (Principal/Admin, Teacher/HOD, Parent), demo login shortcuts on the login page.
- **AI Teaching Assistant**: lesson plan generator, scheme of work generator, exam question generator (Groq `llama-3.3-70b`), each with save-as-draft / submit-for-review, copy, and PDF export.
- **Lesson plans & schemes of work**: teacher submission → HOD approve/return workflow.
- **Attendance**: daily register per stream, with automatic SMS alerts to guardians for absences.
- **Exams & results**: create exams, enter marks, auto-computed Kenya MoE grades (A–E) via a Postgres trigger, results release.
- **Fees**: fee structure, manual payment recording, Pesapal/M-Pesa checkout (mock mode by default), fee defaulters with one-tap SMS reminders, term finance reports.
- **Students & Staff**: core records with add-student form.
- **Settings**: school info, current-term switcher.
- **Parent portal**: mobile-first bottom nav — home, fees (+ pay online), results, attendance. Supports multiple children per guardian.

**Deferred to phase 2** (visible in the nav as "coming soon" so the information architecture is already in place): Library, Timetable, full Communications history/targeting, Super Admin/Bursar-specific screens beyond fees, NEMIS/KNEC integrations.

---

## 2. Prerequisites

- [Node.js 20+](https://nodejs.org)
- A free [Supabase](https://supabase.com) project
- [VS Code](https://code.visualstudio.com) (or any editor)

---

## 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name/region, and save the database password somewhere.
2. Once it's provisioned, open **Project Settings → API**. You'll need:
   - `Project URL`
   - `anon` `public` key
   - `service_role` `secret` key (keep this one server-side only)
3. Open the **SQL Editor** in the Supabase dashboard, open the file `supabase/migrations/0001_init.sql` from this project, paste its full contents in, and click **Run**. This creates every table, enum, trigger, and RLS policy.

---

## 4. Open the project in VS Code

1. Unzip this project and open the folder in VS Code (`File → Open Folder…`).
2. Open a terminal in VS Code: `Terminal → New Terminal` (or `` Ctrl+` ``).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create your local environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` in VS Code and fill in the three Supabase values from step 3. Everything else (Groq, Pesapal, Africa's Talking) can stay as placeholders — the app will automatically run those features in demo/mock mode.

---

## 5. Seed demo data

This creates a demo school ("Greenfield Secondary School") with classes, a few students, sample fee/attendance/exam data, and **5 working login accounts** — one per MVP-relevant role:

```bash
npm run seed
```

Demo accounts (password for all: `password123`):

| Role | Email |
|---|---|
| Principal | `principal@greenfield.ac.ke` |
| Teacher | `teacher@greenfield.ac.ke` |
| HOD | `hod@greenfield.ac.ke` |
| Bursar | `bursar@greenfield.ac.ke` |
| Parent | `parent@greenfield.ac.ke` |

(The login page also has one-tap buttons to fill these in for you.)

---

## 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the login page. Try the **Teacher** account first and open **AI Assistant** from the sidebar to generate a lesson plan (it'll run in demo mode unless you've added a `GROQ_API_KEY`).

The simplest way to run it in VS Code is to just keep the `npm run dev` terminal open and use your browser — no debugger setup required. If you'd like breakpoints in server code, install the built-in "JavaScript Debug Terminal" (already ships with VS Code): open the Command Palette (`Cmd/Ctrl+Shift+P`) → "Debug: JavaScript Debug Terminal", then run `npm run dev` inside it.

---

## 7. Turning on real integrations (optional)

Everything below is optional. Without it, the app clearly labels content as demo/simulated so nothing is misleading.

- **AI Teaching Assistant (Groq)**: get a free key at [console.groq.com](https://console.groq.com), set `GROQ_API_KEY` in `.env.local`.
- **Fee payments (Pesapal)**: sign up for sandbox credentials at [developer.pesapal.com](https://developer.pesapal.com), set `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET`. Switch `PESAPAL_ENV=live` for production credentials.
- **SMS (Africa's Talking)**: create an app at [africastalking.com](https://africastalking.com), set `AFRICASTALKING_USERNAME` / `AFRICASTALKING_API_KEY`.

Restart `npm run dev` after changing `.env.local`.

---

## 8. Project structure

```
src/
  app/
    (staff)/            # Principal / HOD / Teacher / Bursar pages (shared sidebar layout)
    parent/             # Parent portal (bottom nav layout)
    api/                # Route handlers: AI generation, SMS, Pesapal
    login/
  components/           # Shared UI (Sidebar, TopBar, charts, badges, etc.)
  lib/                  # Supabase clients, Groq/Pesapal/Africa's Talking wrappers, formatters
supabase/
  migrations/0001_init.sql   # Full schema + RLS policies
scripts/
  seed.mjs               # Demo data seed script
```

---

## 9. Deploying

This is a standard Next.js app — it deploys as-is to [Vercel](https://vercel.com) (recommended) or any Node host. Set the same environment variables from `.env.local` in your hosting provider's dashboard.
