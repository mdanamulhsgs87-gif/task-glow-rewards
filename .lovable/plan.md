
## App ki korbe (short)

- User signup/login (phone or email)
- Home page e **10 ta task box** (ghor) thakbe
- Protiti task: **Face verify → 3 din wait → Re-verify same face → task DONE**
- 10/10 task done holey **mining unlock** → per-second live balance bare (rate: 500 tk / 30 din)
- User wallet number (bKash/Nagad) ek bar set kore, **change kora jabe na**
- Withdraw request → admin panel a ashbe → admin manually pay kore "paid" mark kore
- Admin panel: saved face photos, users, withdraw requests, task progress dekhbe

## Tech stack

- TanStack Start (already setup)
- Lovable Cloud (Supabase) — database, auth, storage
- Lovable AI Gateway (Gemini 2.5 Flash) — face match (oi reference repo er logic exactly)
- Face capture component — reference repo er FaceCapture.tsx port kora hobe (camera + skin-tone auto-detect)

## Database schema

```text
profiles                 — user info (auth_id, name, role)
wallets                  — user_id, type(bkash/nagad), number, locked=true
                           (insert ekbar, update blocked by RLS)
tasks                    — user_id, slot(1-10), status(empty/verified/reverify_pending/done)
                           initial_verify_at, reverify_due_at, done_at,
                           face_photo_url, face_embedding_ref
mining                   — user_id, total_earned, last_credited_at,
                           is_active (= all 10 tasks done)
withdrawals              — user_id, amount, wallet_snapshot, status(pending/paid/rejected),
                           created_at, paid_at, admin_note
user_roles               — separate table (admin/user) per security guide
```

Mining math: `500 tk / (30*24*60*60) ≈ 0.000192901 tk/sec`. UI te `setInterval(100ms)` diye live bare. Server e on-read recompute: `total = stored_total + (now - last_credited_at) * rate` jodi `is_active`.

## Face verification flow

1. **First verify (task slot):**
   - FaceCapture → photo blob → upload to `face-photos` storage bucket
   - Server fn `verifyFace`: 
     - Duplicate check: call AI gateway → compare to all existing photos
     - If duplicate (confidence ≥ 0.92) → reject "ei face already use hoyeche"
     - Else: save photo URL on `tasks` row, set `initial_verify_at=now`, `reverify_due_at=now+3days`, status='verified'

2. **Re-verify (3 din por):**
   - Task box e "Re-verify" button enable hobe `reverify_due_at` ashle
   - FaceCapture → server fn `reverifyFace(taskId)`:
     - AI compare new photo vs stored `face_photo_url`
     - confidence ≥ 0.85 → status='done', done_at=now
     - Else reject

3. **10/10 done holey:** `mining.is_active = true`, `last_credited_at = now`

## Server functions (createServerFn)

- `getDashboard()` — tasks, wallet, mining balance (live computed), withdraw history
- `verifyFace({ photoBase64, slot })` — duplicate check + save
- `reverifyFace({ photoBase64, taskId })` — AI compare to stored
- `setWallet({ type, number })` — insert only, fails if already exists
- `requestWithdraw({ amount })` — validate min, balance ≥ amount, debit from mining
- `adminListUsers/Withdrawals/Faces()` — admin role gated
- `adminMarkPaid(withdrawalId)` / `adminRejectWithdrawal(...)`

## Routes

```text
/                       — landing/login redirect
/auth                   — login + signup (email/password)
/_authenticated/
  home                  — 10 task boxes + live mining counter + withdraw button
  task/$slot            — face capture for that slot (verify or reverify)
  wallet                — set wallet number (locked after first set)
  withdraw              — request withdraw + history
  profile               — basic info
/_authenticated/admin/
  users                 — all users + task progress
  faces                 — saved face gallery
  withdrawals           — pending/paid withdraw requests, mark paid button
```

## Design

Mobile-first (viewport already 390px). Dark gradient bg (deep navy → cyan accent), Bengali text supported. Task boxes: 5 cols on tablet, 2-col grid on mobile, each box shows slot number + status icon (empty/verified-with-timer/done-checkmark). Live mining counter on top in big mono font.

## Defaults Ami nicchi (apni bolen jodi change korte chan)

- **Min withdraw: 50 TK** (apni answer den nai)
- Daily mining rate calculation theke shows kobe withdrawable hobe
- Admin role: signup er somoy first user auto-admin, baki sob normal user
- Phone-based auth na, email/password + Google (default per guideline)

## Build order

1. Enable Lovable Cloud
2. DB migrations (all tables + RLS + storage bucket)
3. Auth pages + protected layout
4. Wallet set page (lock logic)
5. Home page with 10 task boxes + live mining counter
6. FaceCapture component (port from reference)
7. Face verify + reverify server functions (with AI gateway)
8. Withdraw page
9. Admin panel (users, faces, withdrawals)
10. Polish design

Eta approve korle ami step by step build korbo. Boro app — onek tool call lagbe.
