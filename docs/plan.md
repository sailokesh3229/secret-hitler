# Secret Hitler Mobile — Build Plan for Claude Code

**Version:** 0.3 · **Date:** 2026-10-02
**Use with:** `CLAUDE.md` (repo root), `docs/spec.md`, `docs/plan.md` (this file)

This plan is a list of **steps you run one at a time in Claude Code**. Each step has:
- **Prompt** — paste it into Claude Code.
- **Claude Code checks** — automated checks it must pass before saying "done".
- **Your review** — what *you* look at. If something is off, tell Claude Code in the same session before moving on.

Design is reviewed on your own phone at four points (Steps 5–8) **before** any server work is wired in, so your taste shapes the app early and cheaply.

---

## Before you start (one-time, ~30 minutes)

1. Install: Node.js (LTS), pnpm, Git, Docker Desktop, Claude Code.
2. On your phone: install **Expo Go** (Android/iOS) for the design reviews.
3. Create an empty folder and Git repo, then place the files:
   ```
   your-repo/
   ├─ CLAUDE.md
   └─ docs/
      ├─ spec.md
      └─ plan.md
   ```
4. Fill in the **"Your choice"** column of `docs/spec.md` §9 (design brief). Blanks use the defaults, so you can start now and change taste later — it lives in one theme file.
5. Create a file `docs/design-feedback.md` (empty). You'll write review notes there.

Accounts needed later (not blocking until Step 9): Firebase project, Apple Developer, Google Play Console, Expo account.

---

## Working rhythm

- **One step per Claude Code session.** Start each with the step's prompt.
- When Claude Code finishes: run the review, then commit (`git commit -am "Step N"`).
- Design feedback: write notes in `docs/design-feedback.md`, then prompt: *"Apply the feedback in docs/design-feedback.md, then clear the applied items."*
- If a rule seems wrong, change `docs/spec.md` first, then ask Claude Code to update code + tests.

Tick the boxes in this file as you go.

---

## Part 1 — Foundations & rules engine

### ☑ Step 1 — Scaffold the monorepo
**Prompt**
> Read CLAUDE.md, docs/spec.md and docs/plan.md. Do Step 1: scaffold the pnpm monorepo described in spec §11 and CLAUDE.md (apps/mobile with Expo + expo-router, apps/server with Fastify + Socket.IO, packages/engine, packages/protocol, packages/theme, tools/sim). Add root scripts: lint, typecheck, test, dev:mobile, dev:server. Add docker-compose.yml for Postgres and Redis. Don't build features yet.

**Claude Code checks:** `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass; the mobile app starts with a placeholder screen.
**Your review:** open the placeholder in Expo Go on your phone.

### ☑ Step 2 — Engine: setup and role knowledge
**Prompt**
> Do Step 2: in packages/engine implement game setup per spec R1–R10: role dealing, Party Membership, deck, the board config table (R5) as data, seat order, random first President, and role-reveal knowledge. Use an injectable random source so tests are deterministic. Name each test after its rule ID.

**Claude Code checks:** tests for every count 5–10; R5 is a data table; R8 vs R9 knowledge differences tested.
**Your review:** read the test names — do they match the rules you expect?

### ☑ Step 3 — Engine: elections, votes, chaos
**Prompt**
> Do Step 3: implement R11–R25 in packages/engine: presidential rotation (incl. skipping executed players and Special Election return), Chancellor eligibility with term limits and the ≤5-alive rule, voting with the App rule host reveal (spec §6, including duty transfer and close-voting), election tracker, Chaos, and the Hitler check. Add a test for every rule and every edge case in spec §6.

**Claude Code checks:** tie fails; 3 failures → Chaos with power ignored and term limits cleared; Chaos can win and unlock veto; Special Election return incl. "President twice in a row".

### ☑ Step 4 — Engine: legislation, veto, powers, wins, views
**Prompt**
> Do Step 4: implement R26–R48: legislative session, reshuffle, veto, all four powers driven by the R5 board table, execution effects, win checks and their order (R47). Then implement `projectView(state, playerId)` per spec §8 and a simulator in tools/sim that plays 10,000 random legal games for each player count. Add a leak test that asserts no projected view contains another player's secrets.

**Claude Code checks:** all R-tests pass; simulator finishes every game with a valid winner; leak test passes.
**Your review:** ask Claude Code: *"Show me a coverage table of rule IDs → test names."* Every R1–R48 should appear.

---

## Part 2 — Design in code (your taste, reviewed on your phone)

No server yet. Screens run on **mock data**, and a hidden **dev menu** lets you jump to any screen, any phase, and any player's point of view.

### ☑ Step 5 — Theme and component gallery · Design review 1
**Prompt**
> Do Step 5: build packages/theme from spec §9 (use "Your choice" values, defaults where blank): colours, fonts, spacing, radii, motion timings, haptics, all user-facing strings. Then build a Component Gallery screen in the app (dev menu only) showing every component in every state: buttons, inputs, seat with all badges, policy tiles (Liberal, Fascist, face-down), ballots (Ja, Nein, face-down), role cards (3), envelope, Liberal track, all three Fascist tracks with power icons, election tracker, status line, action panel, sheet, chat bubble, log entry, toast. No hard-coded colours or strings outside packages/theme.

**Your review (on phone):** Does it match your mood words? Are Liberal and Fascist easy to tell apart? Is text readable? Write notes in `docs/design-feedback.md` and apply them before Step 6.

### ☑ Step 6 — Entry screens · Design review 2
**Prompt**
> Do Step 6: build screens S1–S9 from spec §4 with mock data: splash, welcome, sign up/log in (UI only, fake login), one-time code, choose username with avatar, Home with all sections and the resume banner, Create room (mode choice, password, settings, shows generated Room ID), Join room with all error states, Lobby (host and player views, 5 and 10 players, seat reorder for In-person, board preview). Add dev-menu shortcuts to each screen and each state.

**Your review:** walk the path new user → Home → Create room → Lobby. Is "Create a room" the obvious first action? Do 10 players fit in the lobby?

### ☑ Step 7 — Role reveal and game table · Design review 3
**Prompt**
> Do Step 7: build S10 (role reveal with hold-to-reveal envelope, identical for all roles) and S11 (game table: boards, oval seating for 5–10, badges, status line, action panel, bottom bar). Add a dev "scenario switcher": choose player count, phase, and whose phone you are viewing, driven by the real packages/engine state.

**Your review:** check 5 and 10 players on a small phone; check each role's reveal looks identical in layout and timing; check status line wording.

### ☑ Step 8 — Every phase, playable locally · Design review 4
**Prompt**
> Do Step 8: build S12–S19: voting with ballots and host "Reveal votes" + flip-together animation (spec §6), policy hands with drag-or-tap discard/enact, veto request/response, the four power screens and waiting screens exactly as spec §7, executed-player view, Chaos, chat drawer (UI only), game log, game over with full timeline. Add a dev-only "test table" mode where one tester plays every seat in turn against the local engine, so a full game can be clicked through on one phone. This mode must never be available in production builds.

**Your review:** play 2–3 full games on your phone through the test table with 5, 7 and 9 players. Check: the 2nd Fascist policy gives Investigate only for 7+ players; Special Election rotation; Execution of Hitler ends the game; 3 failed elections trigger Chaos. Note anything that feels slow, unclear or ugly.

**After Step 8 the design is "frozen" for v1.** New ideas go into a "v1.1" list at the bottom of `docs/design-feedback.md`.

---

## Part 3 — Server and real multiplayer

### ☐ Step 9 — Database and login
**Prompt**
> Do Step 9: Prisma schema per spec §12, migrations, Docker-based local DB. Firebase Authentication on the server (ID token verification) and in the app (phone, email, Google, Apple) — switch the app to an Expo development build since native Firebase auth doesn't run in Expo Go. Username uniqueness endpoint and creation flow. Replace the fake login from Step 6.

**You do first:** create the Firebase project and give Claude Code the config (never commit secrets — use `.env`).
**Your review:** sign up on your phone with a real phone number; username is saved; log out and back in.

### ☐ Step 10 — Rooms and lobby in real time
**Prompt**
> Do Step 10: REST + Socket.IO for rooms per spec S7–S9 and §13: create (generated Room ID, hashed password), join with all errors and rate limit, leave, kick, ready, seat reorder, settings, host transfer in lobby, start (5–10 players, all ready). Connect the app's lobby to the server.

**Your review:** 5 phones (friends, or simulators + phones) join one room with ID + password; start becomes available at 5.

### ☐ Step 11 — Game over the network
**Prompt**
> Do Step 11: run the engine on the server per room; validate every action; send each phone only `projectView` output; host vote reveal with duty transfer; power flows; Redis persistence with restart recovery; game history saved at game end. Add integration tests with scripted socket clients (tools/sim, test-only) covering a full game per player count, and the leak test on real socket payloads.

**Claude Code checks:** full games pass for 5–10 players; killing and restarting the server mid-game resumes the game; leak test passes.

### ☐ Step 12 — Connect the app: In-person mode end to end
**Prompt**
> Do Step 12: connect role reveal, table and all phases in the app to the server for In-person mode (no chat, no timers). Handle loading, error and reconnect states. Remove mock data from production paths; keep it in the dev menu.

**Your review:** **First real game night** — 5+ friends, same room, own phones. Note every confusion and bug in `docs/design-feedback.md`.

### ☐ Step 13 — Online mode
**Prompt**
> Do Step 13: Online mode per spec §2 and §10: table chat with mute rules (R30, R42) and report; phase timers with countdowns and timeout rules; background/foreground resync; push notifications for "your turn"; invite links that open the app with Room ID filled in; screenshot blocking (Android) and app-switcher cover (iOS) on private screens.

**Your review:** **First online game night** with players in different places. Test turning Wi-Fi off mid-vote and coming back.

### ☐ Step 14 — Remaining screens
**Prompt**
> Do Step 14: S20 game history (list, detail, stats), S21 profile & settings (incl. account deletion), S22 how to play (illustrated walkthrough from spec §5), credits & license screen per spec §15.

**Your review:** every Home section works; account deletion removes your data.

---

## Part 4 — Beta and release

### ☐ Step 15 — Hardening and beta
**Prompt**
> Do Step 15: accessibility pass (screen-reader labels, large text, reduced motion), performance check on a low-end Android profile, crash reporting, rate limits from spec §14, EAS builds for TestFlight and Play internal testing.

**Your review:** 6–10 friend groups play **30+ games**. Target: no secret leaks, almost no crashes, players understand every phase without help.

### ☐ Step 16 — Store release
**Prompt**
> Do Step 16: store listing assets (screenshots from the app), privacy policy page, data safety answers, age rating notes, release builds.

**You do:** resolve the licensing decision (spec D13) **before submitting**, then submit to Apple and Google.

---

## Rules checklist (quick reference for your reviews)

| Situation | Expected |
|---|---|
| Fascist board by count | 5–6: slot 3 Peek, 4–5 Execution · 7–8: slot 2 Investigate, 3 Special Election, 4–5 Execution · 9–10: slots 1–2 Investigate, 3 Special Election, 4–5 Execution · slot 5 also unlocks Veto · slot 6 Fascists win |
| Investigate shows | Party Membership only — Hitler shows "Fascist" |
| Same player investigated twice | Not allowed |
| Special Election | Any other living player; afterwards rotation continues after the caller |
| Execution of Hitler | Liberals win immediately |
| Execution of anyone else | Role stays secret; player removed |
| Vote tie | Fails |
| 3 failed elections in a row | Top policy enacted, power ignored, tracker reset, term limits cleared |
| Chancellor after 3+ Fascist policies | If Hitler → Fascists win; else "Not Hitler" badge |
| Term limits | Last elected President and Chancellor can't be nominated Chancellor; with ≤5 alive only the last Chancellor |
| Veto | Only after 5 Fascist policies; agreed veto moves the tracker +1 |
| Host reveal | Host can only reveal after all votes are in; never sees votes early |
