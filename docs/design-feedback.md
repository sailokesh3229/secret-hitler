# Design Feedback

## Review 1 (after Step 5) - applied

Background, avatars, ballot labels, and the Hitler card structure were
addressed - see docs/spec.md Sec 9 and Decision Log D14/D15, and the
commit applying Review 1 feedback.

## Review 2 (owner's premium design request) - implementation in progress

- Keep the dark background but replace the old button and faction palette.
- Add original tabletop artwork, a stronger visual hierarchy, polished cards,
  lobby and board presentation, and subtle motion.
- Preserve every game rule, label, secret-view constraint and role-neutral
  animation. Bring the same features to web, installable desktop web and
  Android/iOS through the shared Expo app.
- Add genuine account sign-up/log-in when Firebase is configured. Until then,
  mark signed guest accounts as temporary. See spec D17-D18.
