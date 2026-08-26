// dsh-result-only-view — browser half (module-loader bundle)
//
// Adds a default-on "Results only" toggle to the composer tool row
// (conversation.input.left). When on, the conversation hides:
//   - thinking rows            [data-variant="think"]
//   - tool-call nodes          [data-chat-flow-kind="tool-call"]
//   - thinking-only steps      assistant-step flow items with no text/image/JSON body
//   - nested sub-call containers (their rows are hidden too)
// so only user messages and the final assistant reply remain.
//
// While the session is running, every ACTIVE step (a tool call or think block
// whose row has data-state="running") is summarized by a compact one-line chip
// rendered in the flow: tool name + short args hint, or the latest thinking
// line. Chips update live as the step streams (scroll-follow + clip, like the
// native rows) and disappear as soon as the step settles. When nothing is
// running, a single fallback live status line stays visible (the latest
// running tool call, else the last tool call of this turn, else the streaming
// thinking row), scoped to the CURRENT turn (nodes after the last turn-tail
// marker). Everything is removed as soon as the turn settles.
//
// After a turn settles, a compact trace line ("Processed N steps · Xs ▸") is
// rendered in the turn tail; clicking it reveals that turn's process rows
// (native collapsed rows) and lets the user collapse them again. Hovering a
// folded turn's trace line peeks at its process rows while the pointer stays
// inside the conversation.
//
// Process fold mode (Settings → General → Results only):
//   - Auto   (default): a settled turn's process rows fold automatically.
//   - Manual: a settled turn keeps its process rows visible; the user folds
//     that turn from its trace line ("Hide process").
//
// A General settings row adds three preferences:
//   - show the turn trace line (default on)
//   - restore activity animations under prefers-reduced-motion (default on)
//   - Auto vs Manual process fold mode (default Auto)
//
// Whitelist (always visible, interactive cards):
//   - ask_user_question  (the user must answer)
//   - cordis_run         (package approval / run card)
// Approval prompts for privileged execution render in the composer itself
// (ApprovalPanel), so they are never hidden by this plugin.
//
// Buttons, chips and tooltips are localized through the client locale service
// (namespace resultOnlyView, zh-CN / zh / en). Preferences are persisted in
// localStorage so they survive reloads.

window.__ModuleLoader__.load({
  id: "dsh-result-only-view",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    let React = require("react");
    if (React === null || typeof React !== "object") {
      throw new Error("dsh-result-only-view: react is unavailable");
    }
    if (React.useState === undefined && React.default !== undefined && typeof React.default === "object") {
      React = React.default;
    }

    const STORAGE_KEY = "dsh.result-only-view.enabled";
    const SETTINGS_KEY = "dsh.result-only-view.settings";

    const BASE_HIDE_CSS = `
      /* Row-level fallback (also covers browsers without :has support) */
      [data-variant="think"] {
        display: none !important;
      }
      [data-tool]:not([data-tool="ask_user_question"]):not([data-tool="cordis_run"]) {
        display: none !important;
      }
      /* Collapse the whole tool-call node so the 16px column gaps around it disappear */
      [data-chat-flow-kind="tool-call"]:not(:has([data-tool="ask_user_question"])):not(:has([data-tool="cordis_run"])) {
        display: none !important;
      }
      /* Collapse thinking-only steps: have thinking but no text/image/JSON body */
      [data-chat-flow-kind="assistant-step"]:has([data-variant="think"]):not(:has(:is(p, pre, ul, ol, table, blockquote, img, hr, h1, h2, h3, h4, h5, h6, .katex, button))) {
        display: none !important;
      }
      /* Nested sub-call containers: their rows are hidden too, so collapse the
         container itself — otherwise its own margins leave a small blank gap
         below the root tool row. */
      [data-chat-flow] [data-subcalls] {
        display: none !important;
      }
      /* Context injections / recollections (context, context-recall nodes):
         process rows like tool calls and thinking, folded with the rest of the
         turn. Revealed again through the turn trace (click) or hover-peek. */
      [data-chat-flow] [data-chat-flow-kind="context"] {
        display: none !important;
      }
    `;

    // Live-summary chips: one compact line per ACTIVE step (running tool call
    // or think block). Rendered by the plugin into the flow while the step
    // runs; removed as soon as it settles. The line is styled to match the
    // native collapsed rows — transparent background, no border, 14px/24px —
    // so a live update never gets a gray pill box around it and the swap
    // between a chip and the fallback native row is visually seamless. The
    // pulse runs on the label and summary; the prefers-reduced-motion
    // kill-switch is injected separately (CHIP_MOTION_OFF_CSS) only when the
    // user's "restore animations" setting is off, so the default keeps chips
    // alive under reduced motion too.
    const CHIP_CSS = `
      .dsh-rov-chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        align-self: flex-start;
        gap: 6px;
        max-width: 100%;
        margin: 0;
        padding: 0;
      }
      .dsh-rov-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 24px;
        max-width: 100%;
        padding: 0 4px;
        border: none;
        background: transparent;
        border-radius: 6px;
        color: var(--dsw-alias-label-primary);
        font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
        white-space: nowrap;
        user-select: none;
        cursor: pointer;
      }
      .dsh-rov-chip:hover {
        background: var(--dsw-alias-interactive-bg-hover);
      }
      .dsh-rov-chip:focus-visible {
        outline: 1px solid var(--dsw-alias-state-business-primary);
        outline-offset: -1px;
      }
      .dsh-rov-chip-label {
        flex: none;
        font-weight: 400;
        color: var(--dsw-alias-label-primary);
      }
      .dsh-rov-chip-sep {
        flex: none;
        width: 2px;
        height: 2px;
        border-radius: 1px;
        background: var(--dsw-alias-label-caption, rgba(127, 127, 127, 0.5));
      }
      .dsh-rov-chip-summary {
        flex: 0 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dsw-alias-label-tertiary);
        font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      /* Running summary follows the latest content like the native rows:
         clip instead of ellipsis, viewport pinned to the right end. */
      .dsh-rov-chip.running .dsh-rov-chip-summary {
        text-overflow: clip;
      }
      .dsh-rov-chip.running .dsh-rov-chip-label,
      .dsh-rov-chip.running .dsh-rov-chip-summary {
        animation: dsh-rov-chip-pulse 1.6s ease-in-out infinite;
      }
      @keyframes dsh-rov-chip-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
      }
    `;

    // Injected only when the "restore animations under reduced motion"
    // preference is OFF: then the chip pulse honors the system preference.
    const CHIP_MOTION_OFF_CSS = `
      @media (prefers-reduced-motion: reduce) {
        .dsh-rov-chip.running .dsh-rov-chip-label,
        .dsh-rov-chip.running .dsh-rov-chip-summary {
          animation: none;
        }
      }
    `;

    const MOTION_CSS = `
      /* Restore the working shimmer on the turn-status line while Results only is on.
         NOTE: no !important on background-position — an !important base value would
         beat the animation keyframes and freeze the gradient. Hard-coded fallback
         colors make the gradient independent of theme variable resolution. */
      div[data-chat-flow] [class*="_turnStatus"] {
        background: linear-gradient(90deg, var(--dsw-static-deepseek-500, #4d6bfe) 0%, var(--dsw-static-deepseek-500, #4d6bfe) 40%, var(--dsw-static-deepseek-200, #cdd9ff) 50%, var(--dsw-static-deepseek-500, #4d6bfe) 60%, var(--dsw-static-deepseek-500, #4d6bfe) 100%);
        background-size: 250% 100%;
        background-position: 100% 0;
        -webkit-background-clip: text;
        background-clip: text;
        color: #0000;
        -webkit-text-fill-color: transparent;
        animation: dsh-rov-turn-shimmer 1.8s linear infinite;
        animation-play-state: running;
      }
      @keyframes dsh-rov-turn-shimmer {
        to { background-position: 0 0; }
      }

      /* Restore the light sweep on the live running row (tool and thinking rows).
         The plain rgba gradient is a fallback for engines without color-mix(). */
      [data-chat-flow] [data-tool][data-state="running"] [data-disclosure-row]::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 300px;
        background: linear-gradient(90deg, transparent 0%, rgba(128, 128, 128, 0.35) 55%, transparent 100%);
        background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base, #1a1a1a) 60%, transparent) 55%, transparent 100%);
        pointer-events: none;
        animation: dsh-rov-row-sweep 2.6s ease-out infinite;
      }
      [data-chat-flow] [data-variant="think"][data-state="running"] [data-disclosure-row]::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 300px;
        background: linear-gradient(90deg, transparent 0%, rgba(128, 128, 128, 0.35) 55%, transparent 100%);
        background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base, #1a1a1a) 60%, transparent) 55%, transparent 100%);
        pointer-events: none;
        animation: dsh-rov-row-sweep 2.6s ease-out infinite;
      }
      @keyframes dsh-rov-row-sweep {
        0% { left: -300px; }
        90%, 100% { left: 100%; }
      }
    `;

    const DICT_ZH = {
      label: "只看结果",
      onText: "◉ 只看结果",
      offText: "○ 只看结果",
      titleOn: "只看结果已开启：过程已隐藏，运行中以实时摘要芯片展示正在进行的步骤（问答与插件审批卡片除外）。点击恢复完整单行折叠。",
      titleOff: "只看结果已关闭：思考与工具调用以单行折叠显示。点击开启“只看结果”。",
      settingsTitle: "只看结果",
      settingsTrace: "显示过程痕迹行",
      settingsTraceHint: "回合结束后，在对话中显示「已处理 N 步 · Xs」，点击可展开该回合的过程行。",
      settingsMotion: "减少动态效果下仍恢复活动光影",
      settingsMotionHint: "系统开启「减少动态效果」时，仍恢复 Deep diving 光影与运行中行的光带扫过动画。",
      settingsMode: "过程折叠方式",
      settingsModeHint: "自动：回合结束后自动折叠过程行；手动：回合结束后保留过程行，点击回合尾部的「收起过程」再折叠。",
      modeAuto: "自动",
      modeManual: "手动",
      chipThinking: "思考中",
      traceProcessed: "已处理 {steps} 步",
      traceHide: "收起过程",
      traceAria: "展开或收起本回合的过程",
    };
    const DICT_EN = {
      label: "Results only",
      onText: "◉ Results only",
      offText: "○ Results only",
      titleOn: "Results only is on: process steps are hidden, with live summary chips for the steps currently running (question and plugin approval cards stay visible). Click to show the full collapsed process.",
      titleOff: "Results only is off: thinking and tool calls show as collapsed rows. Click to hide the process.",
      settingsTitle: "Results only",
      settingsTrace: "Show turn trace",
      settingsTraceHint: "After a turn settles, show a 'Processed N steps · Xs' line that expands that turn's process rows on click.",
      settingsMotion: "Restore activity animations under reduced motion",
      settingsMotionHint: "Re-enable the Deep diving shimmer and the running-row sweep when the system prefers reduced motion.",
      settingsMode: "Process fold mode",
      settingsModeHint: "Auto: a settled turn's process rows fold automatically. Manual: they stay visible until you fold them from the turn tail.",
      modeAuto: "Auto",
      modeManual: "Manual",
      chipThinking: "Thinking",
      traceProcessed: "Processed {steps} steps",
      traceHide: "Hide process",
      traceAria: "Show or hide this turn's process",
    };

    const FLOW_SELECTOR = "div[data-chat-flow]";
    const TOOL_ITEM_SELECTOR = '[data-chat-flow-kind="tool-call"]';
    const THINK_ROW_SELECTOR = '[data-variant="think"]';
    const TURN_TAIL_SELECTOR = '[data-chat-flow-kind="turn-tail"]';

    // Tool name (data-tool) → short display label for chips, aligned with the
    // official tool row titles. Whitelisted interactive cards are excluded
    // from chips (they stay visible natively), so they never appear here.
    const TOOL_LABELS = {
      bash: "Bash",
      pwsh: "Pwsh",
      read: "Read",
      web_fetch: "Read",
      web_search: "Search",
      grep: "Search",
      glob: "Search",
      write: "Write",
      edit: "Edit",
      run_code: "Code",
      ralph: "Ralph",
      workflow: "Workflow",
      subagent: "Subagent",
      skill: "Skill",
      todo_write: "Todo",
      create_goal: "Goal",
      update_goal: "Goal",
      get_goal: "Goal",
      cordis_package_inspect: "Inspect",
      cordis_runtime_inspect: "Inspect",
      cordis_run: "Run",
      cordis_stop: "Stop",
      cordis_undefine: "Remove",
      report: "Report",
      send_message: "Message",
      web_search_tool: "Search",
    };

    function insertHideCss(css) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-result-only-view";
      tag.dataset.pluginCss = "result-only-hide";
      tag.textContent = css;
      document.head.appendChild(tag);
      return () => {
        tag.remove();
      };
    }

    function readStored(key, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        if (value === null) return fallback;
        return value;
      } catch {
        return fallback;
      }
    }

    function storeValue(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* storage unavailable — preference lives for this page load only */
      }
    }

    function prefersReducedMotion() {
      try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch {
        return false;
      }
    }

    // ---- module state -----------------------------------------------------
    let enabled = true;
    let settings = { trace: true, forceMotion: true, mode: "auto" };
    let cssDispose = null;
    const configListeners = new Set();
    // Bound locale translator, set in apply(); null until then.
    let translate = null;

    function subscribeConfig(fn) {
      configListeners.add(fn);
      return () => {
        configListeners.delete(fn);
      };
    }

    function notifyConfig() {
      for (const fn of configListeners) fn();
    }

    function refreshCss() {
      if (cssDispose !== null) {
        cssDispose();
        cssDispose = null;
      }
      if (enabled) {
        // Chips are only rendered while enabled, so their CSS rides along.
        // Under reduced motion: restore the native shimmer when the user wants
        // animations back (MOTION_CSS), otherwise kill the chip pulse
        // (CHIP_MOTION_OFF_CSS).
        const motionCss = settings.forceMotion ? MOTION_CSS : CHIP_MOTION_OFF_CSS;
        cssDispose = insertHideCss(BASE_HIDE_CSS + CHIP_CSS + motionCss);
      }
    }

    function readEnabled() {
      const stored = readStored(STORAGE_KEY, null);
      return stored === null ? true : stored === "1";
    }

    function storeEnabled(value) {
      storeValue(STORAGE_KEY, value ? "1" : "0");
    }

    function readSettings() {
      const stored = readStored(SETTINGS_KEY, null);
      if (stored !== null) {
        try {
          const parsed = JSON.parse(stored);
          return {
            trace: parsed.trace !== false,
            forceMotion: parsed.forceMotion !== false,
            mode: parsed.mode === "manual" ? "manual" : "auto",
          };
        } catch {
          /* malformed — defaults */
        }
      }
      return { trace: true, forceMotion: true, mode: "auto" };
    }

    function storeSettings(value) {
      storeValue(SETTINGS_KEY, JSON.stringify(value));
    }

    function updateSettings(patch) {
      settings = Object.assign({}, settings, patch);
      storeSettings(settings);
      refreshCss();
      // Reveal state is mode-dependent; a fold-mode or trace change resets the
      // per-turn reveal bookkeeping so the new mode applies cleanly.
      if (patch.trace === false || patch.mode !== undefined) {
        revealedKeys = new Set();
        manualFoldedKeys = new Set();
        clearPeek();
        clearReveal();
      }
      if (patch.mode !== undefined && settings.mode === "manual") {
        scheduleRefresh();
      }
      notifyConfig();
    }

    // ---- live-line management -------------------------------------------
    let liveFlow = null; // flow item element currently forced visible
    let liveRow = null; // inner row element currently forced visible (think or tool row)
    let refreshTimer = null;

    // ---- per-turn reveal management --------------------------------------
    // revealedKeys:    flow-item keys the user (or Manual mode) keeps visible.
    // manualFoldedKeys: keys the user explicitly folded in Manual mode; they
    //                   are excluded from Manual auto-reveal.
    // peekKeys:        transient keys revealed by hover-peek.
    let revealedKeys = new Set();
    let manualFoldedKeys = new Set();
    let peekKeys = new Set();
    let peekHideTimer = null;
    let peekListeners = null;
    let lastPointer = null;
    let revealedApplied = []; // elements currently forced visible by reveal

    // ---- live-summary chip management ------------------------------------
    let chipsContainer = null;
    let chipEls = new Map();

    function clearLive() {
      if (liveFlow !== null && liveFlow.isConnected) liveFlow.style.removeProperty("display");
      if (liveRow !== null && liveRow.isConnected) liveRow.style.removeProperty("display");
      liveFlow = null;
      liveRow = null;
    }

    function clearReveal() {
      for (const entry of revealedApplied) {
        if (entry.flow.isConnected) entry.flow.style.removeProperty("display");
        for (const row of entry.rows) {
          if (row.isConnected) row.style.removeProperty("display");
        }
      }
      revealedApplied = [];
    }

    /** The rendered chat flow column (skip detached/hidden duplicates). */
    function activeFlow() {
      const flows = Array.from(document.querySelectorAll(FLOW_SELECTOR));
      for (const flow of flows) {
        if (flow.getClientRects().length > 0) return flow;
      }
      return flows.length > 0 ? flows[0] : null;
    }

    /** The conversation scrollport (mirrors the host's scrollerOf). */
    function scrollerOf(flow) {
      return flow.closest("[data-conversation-scroll]") ?? flow;
    }

    // ---- reader-anchor preservation ---------------------------------------
    // The host's scroll-follow only defends the at-bottom case, and browser
    // scroll anchoring intermittently fails when the anchor node itself sits
    // inside the rows this plugin reveals/folds (Chromium skips the anchor
    // adjustment whenever the anchor goes display:none with the change, and
    // the viewport then clamps or keeps a stale offset). So every reveal/fold
    // captures the flow's visible seats and restores the deepest surviving one
    // to its pre-change viewport position afterwards. That keeps the reader's
    // place stable mid-page, not just at the bottom.
    function captureAnchors(flow) {
      const anchors = [];
      if (flow === null) return anchors;
      const seats = Array.from(flow.querySelectorAll('[data-chat-anchor-key], ' + TURN_TAIL_SELECTOR));
      for (const seat of seats) {
        if (window.getComputedStyle(seat).display === "none") continue;
        const rect = seat.getBoundingClientRect();
        if (rect.height <= 0) continue;
        anchors.push({ el: seat, top: rect.top });
      }
      return anchors;
    }

    /** Restore the deepest surviving anchor to its pre-change viewport position. */
    function restoreAnchors(flow, anchors) {
      if (anchors.length === 0 || flow === null) return;
      const scrollport = scrollerOf(flow);
      // Deepest first: the content below the reveal/fold block always shifts by
      // the same amount, so any survivor below the changed rows carries the
      // exact viewport delta (0 when the change is below the reader).
      for (let i = anchors.length - 1; i >= 0; i--) {
        const anchor = anchors[i];
        if (!anchor.el.isConnected) continue;
        if (window.getComputedStyle(anchor.el).display === "none") continue;
        const rect = anchor.el.getBoundingClientRect();
        if (rect.height <= 0) continue;
        const delta = rect.top - anchor.top;
        if (Math.abs(delta) > 0.5) scrollport.scrollTop += delta;
        return;
      }
    }

    /** Run a layout-affecting display change with the reader anchor preserved. */
    function withAnchorStable(flow, fn) {
      const anchors = captureAnchors(flow);
      fn();
      restoreAnchors(flow, anchors);
    }

    /** Flow items belonging to the current (running) turn: after the last turn-tail marker. */
    function currentTurnItems(flow) {
      const tails = Array.from(flow.querySelectorAll(TURN_TAIL_SELECTOR));
      const last = tails.length > 0 ? tails[tails.length - 1] : null;
      const items = [];
      let el = last === null ? flow.firstElementChild : last.nextElementSibling;
      while (el !== null) {
        if (el.matches('[data-chat-flow-kind]')) items.push(el);
        el = el.nextElementSibling;
      }
      return items;
    }

    /** Count process steps in the turn whose tail is `tailSeat`. */
    function countTurnSteps(tailSeat) {
      let steps = 0;
      let el = tailSeat.previousElementSibling;
      while (el !== null) {
        if (el.matches && el.matches(TURN_TAIL_SELECTOR)) break;
        if (el.matches && el.matches('[data-chat-flow-kind]')) {
          if (el.matches(TOOL_ITEM_SELECTOR)) {
            steps += 1;
          } else if (el.matches('[data-chat-flow-kind="assistant-step"]') && el.querySelector(THINK_ROW_SELECTOR) !== null) {
            steps += 1;
          }
        }
        el = el.previousElementSibling;
      }
      return steps;
    }

    /** Collect the flow-item keys of the turn whose tail is `tailSeat`. */
    function keysOfTurn(tailSeat) {
      const keys = [];
      let el = tailSeat.previousElementSibling;
      while (el !== null) {
        if (el.matches && el.matches(TURN_TAIL_SELECTOR)) break;
        if (el.matches && el.matches('[data-chat-flow-kind]')) {
          const key = el.getAttribute("data-chat-flow-key");
          if (key !== null) keys.push(key);
        }
        el = el.previousElementSibling;
      }
      return keys;
    }

    /** Keys currently forced visible: user reveals + hover-peek. */
    function effectiveKeys() {
      if (peekKeys.size === 0) return revealedKeys;
      const merged = new Set(revealedKeys);
      for (const key of peekKeys) merged.add(key);
      return merged;
    }

    /** Force the visible flow items (and their hidden rows) visible.
        The whole cycle runs anchor-stable: whatever the reader was looking at
        stays at the same viewport position even when the revealed block is
        large (previously the browser anchoring could skip and the viewport
        clamped or jumped, pushing the reader away from the content). */
    function applyReveal() {
      const flow = activeFlow();
      const anchors = captureAnchors(flow);
      clearReveal();
      if (!enabled) {
        restoreAnchors(flow, anchors);
        return;
      }
      const keys = effectiveKeys();
      const seats = flow === null ? [] : Array.from(flow.querySelectorAll('[data-chat-flow-kind]'));
      for (const seat of seats) {
        const key = seat.getAttribute("data-chat-flow-key");
        if (key === null || !keys.has(key)) continue;
        const entry = { flow: seat, rows: [] };
        const seatStyle = window.getComputedStyle(seat);
        if (seatStyle.display === "none") seat.style.setProperty("display", "block", "important");
        const rows = Array.from(seat.querySelectorAll('[data-tool], ' + THINK_ROW_SELECTOR));
        for (const row of rows) {
          const rowStyle = window.getComputedStyle(row);
          if (rowStyle.display === "none") {
            row.style.setProperty("display", "flex", "important");
            entry.rows.push(row);
          }
        }
        // Nested sub-call containers are hidden by the base CSS; when the seat
        // is revealed the user expects to see its sub-steps, so force them
        // visible too (cleaned up together with the row overrides).
        for (const sub of Array.from(seat.querySelectorAll('[data-subcalls]'))) {
          if (window.getComputedStyle(sub).display === "none") {
            sub.style.setProperty("display", "block", "important");
            entry.rows.push(sub);
          }
        }
        revealedApplied.push(entry);
      }
      restoreAnchors(flow, anchors);
    }

    /** Manual mode: keep every settled turn's process rows visible unless the
        user explicitly folded that turn. Returns true when the reveal set
        actually changed (so React re-renders the trace lines). */
    function autoRevealSettled(flow) {
      if (!enabled || settings.mode !== "manual") return false;
      let changed = false;
      const tails = Array.from(flow.querySelectorAll(TURN_TAIL_SELECTOR));
      for (const tail of tails) {
        const keys = keysOfTurn(tail);
        for (const key of keys) {
          if (!manualFoldedKeys.has(key) && !revealedKeys.has(key)) {
            revealedKeys.add(key);
            changed = true;
          }
        }
      }
      return changed;
    }

    // ---- hover-peek -------------------------------------------------------
    /** Any element inside the chat flow keeps a peek alive; leaving the flow
        (or a 350ms pause outside it) closes the peek. Keeping "inside the
        flow" as the keep-alive condition makes the reveal flicker-free: the
        trace button moves when rows appear below it, so the pointer is
        briefly over revealed rows, not over the button. */
    function isPeekTarget(node) {
      if (node === null || node === undefined || typeof node.closest !== "function") return false;
      try {
        return node.closest(FLOW_SELECTOR) !== null;
      } catch {
        return false;
      }
    }

    function attachPeekListeners() {
      if (peekListeners !== null) return;
      const over = (event) => {
        if (isPeekTarget(event.target)) cancelPeekHide();
      };
      const out = (event) => {
        lastPointer = { x: event.clientX, y: event.clientY };
        const to = event.relatedTarget;
        if (to === null || !isPeekTarget(to)) schedulePeekHide();
      };
      peekListeners = { over, out };
      document.addEventListener("mouseover", over, true);
      document.addEventListener("mouseout", out, true);
    }

    function detachPeekListeners() {
      if (peekListeners === null) return;
      document.removeEventListener("mouseover", peekListeners.over, true);
      document.removeEventListener("mouseout", peekListeners.out, true);
      peekListeners = null;
    }

    function schedulePeekHide() {
      if (peekHideTimer !== null) return;
      peekHideTimer = window.setTimeout(() => {
        peekHideTimer = null;
        // Re-check where the pointer is right now. A layout shift can fire a
        // button mouseleave while the pointer still hovers revealed rows; only
        // close the peek when the pointer is truly outside the conversation.
        if (lastPointer !== null && typeof document.elementFromPoint === "function") {
          try {
            const el = document.elementFromPoint(lastPointer.x, lastPointer.y);
            if (isPeekTarget(el)) return;
          } catch {
            /* fall through to closing */
          }
        }
        endPeek();
      }, 350);
    }

    function cancelPeekHide() {
      if (peekHideTimer !== null) {
        window.clearTimeout(peekHideTimer);
        peekHideTimer = null;
      }
    }

    function startPeek(keys) {
      endPeek();
      peekKeys = new Set(keys);
      attachPeekListeners();
      applyReveal();
    }

    function endPeek() {
      cancelPeekHide();
      if (peekKeys.size === 0) return;
      peekKeys.clear();
      lastPointer = null;
      detachPeekListeners();
      applyReveal();
    }

    function clearPeek() {
      cancelPeekHide();
      detachPeekListeners();
      peekKeys.clear();
      lastPointer = null;
    }

    // ---- live-summary chips ----------------------------------------------
    function toolLabel(tool) {
      const label = TOOL_LABELS[tool];
      return label !== undefined && label !== "" ? label : tool;
    }

    /** Longest non-empty text under a row, skipping expanded bodies
        ([data-open="true"]) so we never pull in the tool output. */
    function longestText(node) {
      let best = "";
      try {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode()) !== null) {
          if (textNode.parentElement !== null && textNode.parentElement.closest('[data-open="true"]') !== null) continue;
          const text = (textNode.data === null || textNode.data === undefined ? "" : textNode.data).trim();
          if (text.length > best.length) best = text;
        }
      } catch {
        /* tree walker unavailable — empty summary */
      }
      return best;
    }

    /** Think summary: the official ReasoningRow real-time anchor
        [data-follow-end] (latest line while running), else longest text. */
    function thinkSummaryOf(row) {
      const follow = row.querySelector('[data-follow-end]');
      if (follow !== null) {
        const text = (follow.textContent === null || follow.textContent === undefined ? "" : follow.textContent).trim();
        if (text !== "") return text;
      }
      return longestText(row);
    }

    /** Tool summary: the collapsed disclosure row's first non-empty text after
        leading + title (separator is empty and skipped). */
    function toolSummaryOf(row) {
      const drow = row.querySelector('[data-disclosure-row]');
      if (drow !== null) {
        const children = Array.from(drow.children);
        for (let i = 2; i < children.length; i++) {
          const text = (children[i].textContent === null || children[i].textContent === undefined ? "" : children[i].textContent).trim();
          if (text !== "") return text;
        }
      }
      return longestText(row);
    }

    /** Active steps of the current turn: running think rows first (thinking
        precedes tool calls), then running tool calls. Whitelisted interactive
        cards are skipped — they stay visible natively. */
    function collectActiveSteps(toolItems, thinkRows) {
      const steps = [];
      const seenSeats = new Set();
      for (const row of thinkRows) {
        if (row.getAttribute("data-state") !== "running") continue;
        if (row.hasAttribute("data-tool")) continue;
        if (row.closest('[data-chat-call-id]') !== null || row.closest('[data-subcalls]') !== null) continue;
        const seat = row.closest('[data-chat-flow-kind]');
        if (seat === null || seenSeats.has(seat)) continue;
        seenSeats.add(seat);
        const key = seat.getAttribute("data-chat-flow-key");
        steps.push({ kind: "think", row: row, seat: seat, seatKey: key !== null ? key : "think" });
      }
      for (const item of toolItems) {
        if (seenSeats.has(item)) continue;
        const running = Array.from(item.querySelectorAll('[data-tool][data-state="running"]'));
        let row = null;
        for (const candidate of running) {
          if (candidate.closest('[data-subcalls]') === null) {
            row = candidate;
            break;
          }
        }
        if (row === null && running.length > 0) row = running[0];
        if (row === null) continue;
        const tool = row.getAttribute("data-tool");
        if (tool === "ask_user_question" || tool === "cordis_run") continue;
        seenSeats.add(item);
        const key = item.getAttribute("data-chat-flow-key");
        steps.push({ kind: "tool", tool: tool, row: row, seat: item, seatKey: key !== null ? key : "tool" });
      }
      return steps;
    }

    /** Update one chip's label/summary; writes are value-guarded so the
        MutationObserver never self-triggers on our own text. */
    function updateChipContent(chip, step) {
      const labelEl = chip.querySelector(".dsh-rov-chip-label");
      const summaryEl = chip.querySelector(".dsh-rov-chip-summary");
      if (labelEl === null || summaryEl === null) return;
      const label = step.kind === "think" ? tr("chipThinking") : toolLabel(step.tool);
      const summary = step.kind === "think" ? thinkSummaryOf(step.row) : toolSummaryOf(step.row);
      if (labelEl.textContent !== label) labelEl.textContent = label;
      if (summaryEl.textContent !== summary) summaryEl.textContent = summary;
      const title = label + (summary === "" ? "" : ": " + summary);
      if (chip.title !== title) chip.title = title;
      // Scroll-follow like the native running rows: viewport pinned to the
      // right end so new content flows in from the right.
      summaryEl.scrollLeft = summaryEl.scrollWidth - summaryEl.clientWidth;
    }

    /** Chip click: keep the step's native row visible and expand it so the
        user can read the actual arguments / output while the step runs.
        The reveal goes through applyReveal (anchor-stable) and the key is
        recorded so the row stays visible after the step settles. */
    function openStep(step) {
      if (!enabled) return;
      const flow = activeFlow();
      if (flow === null || step === null) return;
      if (step.seatKey !== "think" && step.seatKey !== "tool") {
        revealedKeys.add(step.seatKey);
      }
      applyReveal();
      const row = step.row;
      const disclosure = row === null || row === undefined ? null : row.querySelector("[data-disclosure-row]");
      if (disclosure !== null && disclosure.getAttribute("data-expandable") === "true") {
        if (disclosure.getAttribute("aria-expanded") !== "true") disclosure.click();
      }
    }

    /** Reconcile the chips container: placed after the last current-turn item
        (self-heals across React re-renders), one chip per active step. */
    function syncChips(flow, steps) {
      if (chipsContainer === null || !chipsContainer.isConnected) {
        chipsContainer = document.createElement("div");
        chipsContainer.className = "dsh-rov-chips";
        chipsContainer.dataset.plugin = "dsh-result-only-view";
        chipsContainer.dataset.pluginEl = "live-chips";
      }
      const items = currentTurnItems(flow);
      const target = items.length > 0 ? items[items.length - 1] : null;
      if (target !== null) {
        if (chipsContainer.parentElement !== flow || chipsContainer.previousElementSibling !== target) {
          target.after(chipsContainer);
        }
      } else if (chipsContainer.parentElement !== flow) {
        flow.appendChild(chipsContainer);
      }

      const wanted = new Map();
      for (const step of steps) wanted.set(step.seatKey, step);

      for (const entry of Array.from(chipEls)) {
        const key = entry[0];
        if (!wanted.has(key)) {
          entry[1].remove();
          chipEls.delete(key);
        }
      }
      for (const entry of wanted) {
        const key = entry[0];
        const step = entry[1];
        let chip = chipEls.get(key);
        if (chip === undefined || !chip.isConnected) {
          chip = document.createElement("div");
          chip.className = "dsh-rov-chip running";
          chip.dataset.seatKey = key;
          const labelEl = document.createElement("span");
          labelEl.className = "dsh-rov-chip-label";
          const sepEl = document.createElement("span");
          sepEl.className = "dsh-rov-chip-sep";
          const summaryEl = document.createElement("span");
          summaryEl.className = "dsh-rov-chip-summary";
          chip.appendChild(labelEl);
          chip.appendChild(sepEl);
          chip.appendChild(summaryEl);
          chip.setAttribute("role", "button");
          chip.setAttribute("tabIndex", "0");
          chip.setAttribute("aria-label", step.kind === "think" ? tr("chipThinking") : toolLabel(step.tool));
          chip.addEventListener("click", () => openStep(step));
          chip.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openStep(step);
            }
          });
          chipsContainer.appendChild(chip);
          chipEls.set(key, chip);
        }
        updateChipContent(chip, step);
      }
    }

    function removeChips() {
      if (chipsContainer !== null) {
        chipsContainer.remove();
        chipsContainer = null;
      }
      chipEls = new Map();
    }

    // ---- live refresh -----------------------------------------------------
    /** Pick and reveal the live view for the current turn:
        - ≥1 active step → one summary chip per step (native rows stay hidden);
        - else the single fallback live line (latest running tool, else last
          tool of the turn, else the streaming think row);
        then Manual-mode auto-reveal for settled turns and reveal application. */
    function refreshLive() {
      if (!enabled) {
        clearLive();
        removeChips();
        applyReveal();
        return;
      }
      try {
        const flow = activeFlow();
        if (flow === null) {
          clearLive();
          removeChips();
          applyReveal();
          return;
        }
        const turnRunning =
          flow.querySelector('[class*="_turnStatus"]') !== null || flow.querySelector('[role="status"]') !== null;

        const turnItems = currentTurnItems(flow);
        const turnSet = new Set(turnItems);
        const toolItems = Array.from(flow.querySelectorAll(TOOL_ITEM_SELECTOR)).filter((item) => turnSet.has(item));
        const thinkRows = Array.from(flow.querySelectorAll(THINK_ROW_SELECTOR)).filter((row) => {
          const seat = row.closest('[data-chat-flow-kind]');
          return seat !== null && turnSet.has(seat);
        });

        const activeSteps = collectActiveSteps(toolItems, thinkRows);

        if (activeSteps.length > 0) {
          // Live chips replace the forced-native-row status line while any
          // step is actively running; the native rows stay hidden by CSS.
          clearLive();
          syncChips(flow, activeSteps);
        } else {
          removeChips();

          let candidateFlow = null;
          let candidateRow = null;

          // 1. the last running tool call of this turn (live state updates)
          for (let i = toolItems.length - 1; i >= 0; i--) {
            if (toolItems[i].querySelector('[data-state="running"]') !== null) {
              candidateFlow = toolItems[i];
              break;
            }
          }
          // 2. else the last tool call of this turn — stays visible through thinking phases
          if (candidateFlow === null && turnRunning && toolItems.length > 0) {
            candidateFlow = toolItems[toolItems.length - 1];
          }
          // 3. else (no tools in this turn yet) the streaming thinking row
          if (candidateFlow === null && turnRunning) {
            for (let i = thinkRows.length - 1; i >= 0; i--) {
              if (thinkRows[i].getAttribute("data-state") === "running") {
                candidateRow = thinkRows[i];
                candidateFlow = candidateRow.closest('[data-chat-flow-kind]');
                break;
              }
            }
          }
          // 4. else (no tools in this turn yet) the last thinking row
          if (candidateFlow === null && turnRunning && thinkRows.length > 0) {
            candidateRow = thinkRows[thinkRows.length - 1];
            candidateFlow = candidateRow.closest('[data-chat-flow-kind]');
          }

          const toolRowReveal =
            candidateFlow !== null && candidateRow === null ? candidateFlow.querySelector('[data-tool]') : null;
          const nextRow = candidateRow !== null ? candidateRow : toolRowReveal;

          // Measure BEFORE touching styles: a forced style recalc between
          // clear and apply would restart CSS animations. Elements that are
          // already visible (e.g. whitelisted interactive cards) keep their
          // native display — forcing flex on them could break their layout.
          const flowHidden =
            candidateFlow !== null &&
            candidateFlow.isConnected &&
            window.getComputedStyle(candidateFlow).display === "none";
          const rowHidden =
            nextRow !== null && nextRow.isConnected && window.getComputedStyle(nextRow).display === "none";

          // Idempotent: while the live target is unchanged, do not touch styles.
          // (Removing and re-adding the display property would tear down and
          // restart the CSS sweep animation on every refresh.)
          if (!(candidateFlow === liveFlow && nextRow === liveRow)) {
            withAnchorStable(flow, () => {
              clearLive();
              if (candidateFlow !== null && candidateFlow.isConnected) {
                if (flowHidden) candidateFlow.style.setProperty("display", "block", "important");
                // Tool candidates: the inner ToolRow root ([data-tool]) is hidden by the
                // row-level fallback rule, so it must be revealed too — otherwise the
                // forced-visible flow item renders as a blank line.
                if (nextRow !== null && rowHidden) nextRow.style.setProperty("display", "flex", "important");
              }
            });
            liveFlow = candidateFlow;
            liveRow = nextRow;
          }
        }

        if (autoRevealSettled(flow)) notifyConfig();
        applyReveal();
      } catch {
        clearLive();
        clearReveal();
        removeChips();
      }
    }

    function scheduleRefresh() {
      if (refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshLive();
      }, 120);
    }

    /** Watch the page for node/state changes and keep the live view current.
        Fully event-driven: childList covers node arrival/removal (including the
        turn-status marker), the data-state attribute filter covers tool and
        thinking state transitions, and characterData covers streaming text so
        chip summaries follow the latest content — no polling interval. */
    function installWatcher() {
      const observer = new MutationObserver(() => {
        scheduleRefresh();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state"],
        characterData: true,
      });
      return () => {
        observer.disconnect();
        if (refreshTimer !== null) {
          window.clearTimeout(refreshTimer);
          refreshTimer = null;
        }
        clearLive();
        clearReveal();
        removeChips();
        clearPeek();
      };
    }

    function formatSecs(ms) {
      const total = Math.round(ms / 1000);
      if (total < 60) return total + "s";
      return Math.floor(total / 60) + "m" + (total % 60) + "s";
    }

    function turnDurationSecs(turn) {
      if (turn === null || typeof turn !== "object") return null;
      const start = turn.start !== null && typeof turn.start === "object" ? turn.start.time : void 0;
      const end = turn.end !== null && typeof turn.end === "object" ? turn.end.time : void 0;
      if (typeof start !== "number" || typeof end !== "number" || end <= start) return null;
      return formatSecs(end - start);
    }

    /** Locale-aware text with an English fallback (also used by chips before
        the locale service binds, and when registration fails). */
    function tr(key, params) {
      if (translate !== null) return translate(key, params);
      let text = DICT_EN[key] !== undefined ? DICT_EN[key] : key;
      if (params !== undefined && params !== null) {
        for (const name of Object.keys(params)) {
          text = text.split("{" + name + "}").join(String(params[name]));
        }
      }
      return text;
    }

    function apply(ctx) {
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      const locale = ctx.get("locale");

      let t = (key, params) => {
        let text = DICT_EN[key] !== undefined ? DICT_EN[key] : key;
        if (params !== undefined && params !== null) {
          for (const name of Object.keys(params)) {
            text = text.split("{" + name + "}").join(String(params[name]));
          }
        }
        return text;
      };
      if (locale !== undefined) {
        try {
          ctx.effect(() => {
            const d1 = locale.register("resultOnlyView", "zh-CN", DICT_ZH);
            const d2 = locale.register("resultOnlyView", "zh", DICT_ZH);
            const d3 = locale.register("resultOnlyView", "en", DICT_EN);
            return () => {
              d1();
              d2();
              d3();
            };
          });
          t = locale.bind("resultOnlyView");
        } catch {
          /* namespace collision or registration failure — keep the English fallback */
        }
      }
      translate = t;

      enabled = readEnabled();
      settings = readSettings();
      ctx.effect(installWatcher);
      ctx.effect(() => () => {
        if (cssDispose !== null) {
          cssDispose();
          cssDispose = null;
        }
      });
      refreshCss();

      function ResultOnlyToggle() {
        const [on, setOn] = React.useState(enabled);
        const [rev, setRev] = React.useState(0);
        React.useEffect(() => {
          const d1 = subscribeConfig(() => {
            setOn(enabled);
          });
          const d2 = locale === undefined ? undefined : locale.subscribe(() => setRev((v) => v + 1));
          return () => {
            d1();
            if (d2 !== undefined) d2();
          };
        }, []);
        React.useEffect(() => {
          if (!on) {
            clearLive();
            clearReveal();
            removeChips();
            return;
          }
          scheduleRefresh();
        }, [on]);

        const toggle = () => {
          enabled = !enabled;
          setOn(enabled);
          storeEnabled(enabled);
          refreshCss();
          if (!enabled) {
            clearLive();
            clearReveal();
            removeChips();
            clearPeek();
          } else {
            scheduleRefresh();
          }
          notifyConfig();
        };

        return React.createElement(
          "button",
          {
            type: "button",
            "aria-pressed": on,
            title: t(on ? "titleOn" : "titleOff"),
            onClick: toggle,
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              height: "22px",
              padding: "0 8px",
              borderRadius: "11px",
              border: on
                ? "1px solid var(--dsw-alias-state-business-primary)"
                : "1px solid var(--dsw-alias-border-l2)",
              background: on
                ? "var(--dsw-alias-state-business-tertiary)"
                : "var(--dsw-alias-interactive-bg-hover)",
              color: on
                ? "var(--dsw-alias-label-primary-bluish)"
                : "var(--dsw-alias-label-secondary)",
              fontSize: "12px",
              lineHeight: "18px",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            },
          },
          t(on ? "onText" : "offText"),
        );
      }

      function TurnTrace(props) {
        const seatRef = React.useRef(null);
        const [enabledNow, setEnabledNow] = React.useState(enabled);
        const [traceOn, setTraceOn] = React.useState(settings.trace);
        const [modeNow, setModeNow] = React.useState(settings.mode);
        const [rev, setRev] = React.useState(0);
        React.useEffect(() => {
          const d1 = subscribeConfig(() => {
            setEnabledNow(enabled);
            setTraceOn(settings.trace);
            setModeNow(settings.mode);
            // Reveal bookkeeping changes (click reveal/fold, Manual auto-reveal)
            // also flow through notifyConfig so the derived label stays current.
            setRev((v) => v + 1);
          });
          const d2 = locale === undefined ? undefined : locale.subscribe(() => setRev((v) => v + 1));
          return () => {
            d1();
            if (d2 !== undefined) d2();
          };
        }, []);
        // The step count is read from the DOM through seatRef; on the first
        // render the ref is not attached yet (count would read 0), so re-render
        // once before paint.
        React.useLayoutEffect(() => {
          setRev((v) => v + 1);
        }, []);
        if (!enabledNow || !traceOn) return null;

        const seat =
          seatRef.current === null ? null : seatRef.current.closest(TURN_TAIL_SELECTOR);
        const steps = seat === null ? 0 : countTurnSteps(seat);
        const secs = turnDurationSecs(props.turn);
        const keys = seat === null ? [] : keysOfTurn(seat);
        const revealed = keys.length > 0 && keys.every((key) => revealedKeys.has(key));
        const label = revealed
          ? t("traceHide")
          : t("traceProcessed", { steps: String(steps) }) + (secs === null ? "" : " · " + secs);

        const toggle = () => {
          if (seat === null) return;
          const turnKeys = keysOfTurn(seat);
          if (revealed) {
            for (const key of turnKeys) {
              revealedKeys.delete(key);
              if (modeNow === "manual") manualFoldedKeys.add(key);
            }
          } else {
            for (const key of turnKeys) {
              revealedKeys.add(key);
              manualFoldedKeys.delete(key);
            }
          }
          notifyConfig();
          applyReveal();
        };

        // Hover a folded turn to peek at its process rows. Only meaningful when
        // the turn is currently folded (in Manual mode it is revealed by
        // default, so nothing to peek).
        const peekIn = () => {
          if (seat === null || revealed) return;
          startPeek(keysOfTurn(seat));
        };
        const peekOut = () => {
          schedulePeekHide();
        };

        return React.createElement(
          "button",
          {
            type: "button",
            ref: seatRef,
            className: "dsh-rov-trace-btn",
            "aria-expanded": revealed,
            title: t("traceAria"),
            onClick: toggle,
            onMouseEnter: peekIn,
            onMouseLeave: peekOut,
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              height: "20px",
              padding: "0 6px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--dsw-alias-label-tertiary)",
              fontSize: "12px",
              lineHeight: "18px",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            },
          },
          label + (revealed ? " ▾" : " ▸"),
        );
      }

      function SettingsRow() {
        const [, force] = React.useState(0);
        const [rev, setRev] = React.useState(0);
        React.useEffect(() => {
          const d1 = subscribeConfig(() => force((v) => v + 1));
          const d2 = locale === undefined ? undefined : locale.subscribe(() => setRev((v) => v + 1));
          return () => {
            d1();
            if (d2 !== undefined) d2();
          };
        }, []);

        const checkRow = (checked, onToggle, labelText, hintText) =>
          React.createElement(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                marginTop: "8px",
                cursor: "pointer",
              },
            },
            React.createElement("input", {
              type: "checkbox",
              checked,
              onChange: onToggle,
              style: { marginTop: "2px", flex: "none" },
            }),
            React.createElement(
              "span",
              { style: { display: "flex", flexDirection: "column", gap: "2px" } },
              React.createElement("span", { style: { fontSize: "13px", lineHeight: "20px", color: "var(--dsw-alias-label-primary)" } }, labelText),
              React.createElement("span", { style: { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" } }, hintText),
            ),
          );

        const modeOption = (value, labelText) =>
          React.createElement(
            "label",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontSize: "13px",
                lineHeight: "20px",
                color: "var(--dsw-alias-label-secondary)",
              },
            },
            React.createElement("input", {
              type: "radio",
              name: "dsh-rov-fold-mode",
              checked: settings.mode === value,
              onChange: () => updateSettings({ mode: value }),
              style: { margin: 0, flex: "none" },
            }),
            labelText,
          );

        const modeBlock = React.createElement(
          "div",
          { style: { marginTop: "8px" } },
          React.createElement(
            "div",
            { style: { fontSize: "13px", lineHeight: "20px", color: "var(--dsw-alias-label-primary)" } },
            t("settingsMode"),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: "16px", marginTop: "6px" } },
            modeOption("auto", t("modeAuto")),
            modeOption("manual", t("modeManual")),
          ),
          React.createElement(
            "div",
            { style: { fontSize: "12px", lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)", marginTop: "4px" } },
            t("settingsModeHint"),
          ),
        );

        return React.createElement(
          "div",
          { style: { padding: "8px 0" } },
          React.createElement(
            "div",
            { style: { fontSize: "14px", fontWeight: 500, lineHeight: "22px", color: "var(--dsw-alias-label-primary)" } },
            t("settingsTitle"),
          ),
          checkRow(settings.trace, () => updateSettings({ trace: !settings.trace }), t("settingsTrace"), t("settingsTraceHint")),
          checkRow(
            settings.forceMotion,
            () => updateSettings({ forceMotion: !settings.forceMotion }),
            t("settingsMotion"),
            t("settingsMotionHint"),
          ),
          modeBlock,
        );
      }

      slots.inject("conversation.input.left", () =>
        slots.register(
          { name: "conversation.input.left", id: "result-only-toggle", order: 0, label: () => t("label") },
          ResultOnlyToggle,
        ),
      );

      slots.inject("conversation.chat.turnTail", () =>
        slots.register(
          {
            name: "conversation.chat.turnTail",
            select: () => (enabled && settings.trace ? {} : null),
          },
          TurnTrace,
        ),
      );

      slots.inject("settings.general.item", () =>
        slots.register(
          { name: "settings.general.item", id: "result-only-view", order: 30, label: () => t("settingsTitle") },
          SettingsRow,
        ),
      );
    }

    exports.apply = apply;
    return module.exports;
  },
});
