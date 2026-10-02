# CLAUDE.md

Mobile multiplayer social-deduction game (Secret Hitler rules) for 5–10 human players, Android + iOS.

## Read first
- `docs/spec.md` — what to build. Rule IDs R1–R48, screens S1–S22, design brief §9.
- `docs/plan.md` — build order. Do **only the step you are asked to do**.
- `docs/design-feedback.md` — owner's design notes to apply.

If the spec is unclear or seems wrong, stop and ask. Don't invent rules. Record agreed changes in spec §16.

## Non-negotiable rules
1. **Server is the only source of truth.** Phones send actions; the server validates with `packages/engine` and replies.
2. **Never leak secrets.** Phones receive only `projectView(state, playerId)`. Never send roles, hands, discards, unrevealed votes, investigation or peek results to anyone not allowed (spec §8). Every new payload needs a leak-test case.
3. **Engine is pure.** `packages/engine` has no I/O, no timers, no `Math.random`. Randomness is injected (secure random in production, seeded in tests).
4. **Boards are data.** Presidential powers come from the R5 config table. Never hard-code "slot 2 = investigate".
5. **Every rule has a test** named with its rule ID, e.g. `it("R14: with ≤5 alive only last Chancellor is blocked")`.
6. **Theme pack only.** All colours, fonts, spacing, motion timings and user-facing strings come from `packages/theme`. Engine and protocol use neutral identifiers (`TEAM_LIBERAL`, `TEAM_FASCIST`, `ROLE_LEADER`, `VOTE_YES`, `VOTE_NO`) so names can be rebranded.
7. **No tells.** All roles and all private results use identical layout, animation duration and haptics.
8. **No bots in production.** Scripted clients and the "test table" mode exist only in tests and dev builds.

## Stack
pnpm workspaces · TypeScript (strict) · Expo + expo-router + Reanimated + Gesture Handler + Zustand · Fastify + Socket.IO · Prisma + PostgreSQL · Redis · Firebase Authentication · Expo Notifications · Vitest · zod.

```
apps/mobile        Expo app
apps/server        Fastify + Socket.IO server
packages/engine    Pure rules engine + projectView
packages/protocol  Event names, payload types, zod schemas
packages/theme     Design tokens, strings, icons
tools/sim          Test-only scripted clients and game simulator
docs/              spec, plan, design feedback
```

## Commands (created in plan Step 1)
- `pnpm install`
- `pnpm dev:mobile` — Expo dev server
- `pnpm dev:server` — API + sockets (needs `docker compose up -d`)
- `pnpm lint` · `pnpm typecheck` · `pnpm test`

## Definition of done for every step
- `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.
- New rules/flows have tests; leak test still passes.
- Tick the step's box in `docs/plan.md`.
- Finish with a short summary: what changed, how to try it on a phone, anything you need from the owner.

## UI and copy
- Follow spec §9 tokens and fixed rules (contrast AA, 44 pt touch targets, reduced motion, large text, colour never the only signal).
- Sentence case. Buttons name the action: "Nominate Arjun", "Cast vote", "Reveal votes", "Execute Rohan".
- Errors say what happened and how to fix it: "Arjun was Chancellor last round. Choose someone else."
- Every screen has loading, error and no-connection states and works at 360 pt width.

## Secrets
Never commit keys. Use `.env` files (gitignored) and provide `.env.example`.
