# Changelog

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
