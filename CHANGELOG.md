# Changelog

## [1.6.3] - 2026-08-27

- Changed: the turn trace line no longer reveals a folded turn's process rows
  on hover ("hover-peek" removed). Expanding is strictly click-driven now:
  click the `Processed N steps · Xs` line to reveal that turn's process rows,
  click again to fold them back — moving the pointer across the line (or across
  the revealed rows) never expands or collapses anything. The hover keep-alive
  machinery was removed with it; clicks still re-fold instantly.

## [1.6.2] - 2026-08-23

- Added: context-injection / context-recall rows (`data-chat-flow-kind="context"`,
  e.g. skill catalogs, workspace instruction files, recalled sessions) are now
  folded with the rest of the turn's process. They re-appear through the turn
  trace line (click to reveal / hover to peek) like tool and thinking rows, and
  expand natively.

## [1.6.1] - 2026-08-23

- Fixed: reveal/fold of a turn's process rows could throw the reader's view
  away from their reading position. The host's scroll-follow only defends the
  at-bottom case, and browser scroll anchoring intermittently skips its
  adjustment when the anchor node sits inside the rows being revealed/folded —
  the viewport then visibly jumped (the content slipped up out of view and the
  reader had to scroll back down; or a fold while reading inside the rows
  clamped the view to the bottom). Every reveal, fold and live-line swap now
  captures the flow anchor (deepest visible seat) and restores it to its
  pre-change viewport position, so the reading position stays put regardless of
  the browser's anchoring.
- Added: live chips are now clickable. Clicking (or Enter/Space on) a running
  step's chip keeps that step's native row visible and expands it, so the
  actual arguments/output can be inspected while it runs — restoring the
  pre-chips ability to expand running thinking/tool rows; the row stays
  visible after the step settles.
- Fixed: revealed tool rows with nested sub-calls now show their sub-steps
  whether or not the row is expanded (the `[data-subcalls]` container was
  permanently hidden by the base CSS even when the seat was revealed).

## [1.6.0] - 2026-08-22

- Added: live-summary chips. While a tool call or think block is running, a
  compact one-line chip per active step (tool name + short args hint, or the
  latest thinking line) replaces the single forced-native-row status line.
  Chips are rendered by the plugin into the chat flow, follow streaming text
  like the native rows (scroll-follow + clip), and disappear as soon as the
  step settles. Chips are styled as plain lines — transparent background, no
  border, native 14px/24px metrics — so live updates never get a pill box and
  chip ↔ fallback-native-row swaps are visually seamless. Whitelisted
  interactive cards (`ask_user_question`, `cordis_run`) stay visible
  natively and never get a chip.
- Added: Auto vs Manual process fold mode (Settings → General → Results only).
  Auto (default) folds a settled turn's process rows automatically, as
  before. Manual keeps a settled turn's process rows visible and folds that
  turn only from its trace line ("Hide process"). The default stays Auto —
  matching the plugin's original behavior and the always-auto design of the
  dsh-auto-collapse competitor; switching modes resets per-turn fold state.
- Added: hover a folded turn's trace line to peek at its process rows. The
  peek follows the pointer while it stays inside the conversation (flicker-
  free around the layout shift) and folds back once the pointer leaves.
- The MutationObserver now also watches characterData so chip summaries track
  streaming text; previously only childList and data-state were observed.

## [1.5.2] — docs & packaging

- README expanded to the ecosystem 9-section standard (Quick start,
  Configuration, Permissions & data, Troubleshooting, License & security).
- Declared `react` and the injected official client packages as
  peerDependencies.

## [1.5.1] — trace count fix

- Fixed: the turn trace line showed "Processed 0 steps" on the first render
  (the DOM ref used for counting is attached only after mount); the count is
  now recomputed before paint via useLayoutEffect.

## [1.5.0] — turn trace, settings, performance

- Added: a compact turn trace line ("Processed N steps · Xs ▸") in the turn
  tail of every settled turn; clicking it reveals that turn's process rows
  (native collapsed rows) and lets the user collapse them again.
- Added: a General settings row (Results only) with two preferences —
  show/hide the turn trace, and restore activity animations under
  prefers-reduced-motion (both default on, persisted in localStorage).
- Performance: removed the 800ms polling interval; refreshes are fully
  event-driven (MutationObserver on node changes and data-state transitions).
- Motion restore rules are now optional and rebuilt live when the setting
  changes.

## [1.4.1] — robustness fixes

- Fixed: whitelisted interactive cards keep their native display instead of
  being forced to `flex` (could break card layout).
- Fixed: plain rgba fallback for the sweep gradient on engines without
  `color-mix()` support (older Safari).
- Fixed: locale registration failure (e.g. namespace collision) now degrades
  to the English dictionary instead of failing the plugin.
- Fixed: `scripts/verify.mjs` is now included in the published files.

## [1.4.0] — stable release

- Removed all development diagnostics; shipped the clean stable bundle.
- Fixed: nested sub-call containers now collapse with their rows, eliminating
  the small blank gap below tool rows that have sub-calls.
- Confirmed: no extra vertical space around the live status line
  (flow-item height equals row height for tool rows).

## [1.3.x] — live-line and animation hardening

- Live status line scoped to the CURRENT turn (nodes after the last
  turn-tail marker); earlier versions could pick stale rows from previous
  turns during thinking phases.
- Tool candidates now reveal their inner `[data-tool]` row as well as the
  flow item (previously rendered as a blank line).
- Restored the "Deep diving" shimmer and the running-row light sweep for
  environments with `prefers-reduced-motion: reduce`, using hard-coded
  gradient fallbacks and `animation-play-state: running`.
- Fixed animation restarts caused by a `getComputedStyle` probe forcing a
  synchronous style recalc between hide/show steps; refreshes are now
  idempotent (styles untouched while the live target is unchanged).

## [1.2.0] — diagnostics and reduced-motion support

- Re-enabled the turn-status shimmer while Results only is on.
- Added debug tooltip instrumentation (removed in 1.4.0).

## [1.1.0] — live status line

- While the session runs, exactly one live status line is shown with
  native real-time updates; it disappears when the run settles.

## [1.0.0] — initial release

- Default-on "Results only" toggle in the composer tool row.
- Hides thinking rows, tool-call nodes, and thinking-only steps via stable
  DOM attributes; interactive cards (`ask_user_question`, `cordis_run`)
  stay visible.
- zh-CN / en localization through the client locale service; preference
  persisted in localStorage.
