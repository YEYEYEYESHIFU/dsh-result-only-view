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
// While the session is running, exactly ONE live status line stays visible,
// scoped to the CURRENT turn (nodes after the last turn-tail marker):
//   - the last running tool call (native real-time updates)
//   - else the last tool call of this turn (stays through thinking phases)
//   - else the streaming thinking row (before the first tool of the turn)
//   - else the last thinking row of this turn
// Everything is removed as soon as the turn settles.
//
// After a turn settles, a compact trace line ("Processed N steps · Xs ▸") is
// rendered in the turn tail; clicking it reveals that turn's process rows
// (native collapsed rows) and lets the user collapse them again.
//
// A General settings row adds two preferences:
//   - show the turn trace line (default on)
//   - restore activity animations under prefers-reduced-motion (default on)
//
// Whitelist (always visible, interactive cards):
//   - ask_user_question  (the user must answer)
//   - cordis_run         (package approval / run card)
// Approval prompts for privileged execution render in the composer itself
// (ApprovalPanel), so they are never hidden by this plugin.
//
// Buttons and tooltips are localized through the client locale service
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
      titleOn: "只看结果已开启：过程已隐藏，运行中优先显示本回合最新一条工具调用行（问答与插件审批卡片除外）。点击恢复完整单行折叠。",
      titleOff: "只看结果已关闭：思考与工具调用以单行折叠显示。点击开启“只看结果”。",
      settingsTitle: "只看结果",
      settingsTrace: "显示过程痕迹行",
      settingsTraceHint: "回合结束后，在对话中显示「已处理 N 步 · Xs」，点击可展开该回合的过程行。",
      settingsMotion: "减少动态效果下仍恢复活动光影",
      settingsMotionHint: "系统开启「减少动态效果」时，仍恢复 Deep diving 光影与运行中行的光带扫过动画。",
      traceProcessed: "已处理 {steps} 步",
      traceHide: "收起过程",
      traceAria: "展开或收起本回合的过程",
    };
    const DICT_EN = {
      label: "Results only",
      onText: "◉ Results only",
      offText: "○ Results only",
      titleOn: "Results only is on: process steps are hidden, with one live line preferring the latest tool call of the current turn (question and plugin approval cards stay visible). Click to show the full collapsed process.",
      titleOff: "Results only is off: thinking and tool calls show as collapsed rows. Click to hide the process.",
      settingsTitle: "Results only",
      settingsTrace: "Show turn trace",
      settingsTraceHint: "After a turn settles, show a 'Processed N steps · Xs' line that expands that turn's process rows on click.",
      settingsMotion: "Restore activity animations under reduced motion",
      settingsMotionHint: "Re-enable the Deep diving shimmer and the running-row sweep when the system prefers reduced motion.",
      traceProcessed: "Processed {steps} steps",
      traceHide: "Hide process",
      traceAria: "Show or hide this turn's process",
    };

    const FLOW_SELECTOR = "div[data-chat-flow]";
    const TOOL_ITEM_SELECTOR = '[data-chat-flow-kind="tool-call"]';
    const THINK_ROW_SELECTOR = '[data-variant="think"]';
    const TURN_TAIL_SELECTOR = '[data-chat-flow-kind="turn-tail"]';

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
    let settings = { trace: true, forceMotion: true };
    let cssDispose = null;
    const configListeners = new Set();

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
        cssDispose = insertHideCss(settings.forceMotion ? BASE_HIDE_CSS + MOTION_CSS : BASE_HIDE_CSS);
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
          };
        } catch {
          /* malformed — defaults */
        }
      }
      return { trace: true, forceMotion: true };
    }

    function storeSettings(value) {
      storeValue(SETTINGS_KEY, JSON.stringify(value));
    }

    function updateSettings(patch) {
      settings = Object.assign({}, settings, patch);
      storeSettings(settings);
      refreshCss();
      if (patch.trace === false) {
        revealedKeys = new Set();
        clearReveal();
      }
      notifyConfig();
    }

    // ---- live-line management -------------------------------------------
    let liveFlow = null; // flow item element currently forced visible
    let liveRow = null; // inner row element currently forced visible (think or tool row)
    let refreshTimer = null;

    // ---- per-turn reveal management --------------------------------------
    let revealedKeys = new Set(); // data-chat-flow-key values of revealed flow items
    let revealedApplied = []; // elements currently forced visible by reveal

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

    /** Force the revealed flow items (and their hidden rows) visible. */
    function applyReveal() {
      clearReveal();
      if (!enabled || revealedKeys.size === 0) return;
      const flow = activeFlow();
      if (flow === null) return;
      const seats = Array.from(flow.querySelectorAll('[data-chat-flow-kind]'));
      for (const seat of seats) {
        const key = seat.getAttribute("data-chat-flow-key");
        if (key === null || !revealedKeys.has(key)) continue;
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
        revealedApplied.push(entry);
      }
    }

    /** Pick and reveal the single live line; hide it when the turn is not running. */
    function refreshLive() {
      if (!enabled) {
        clearLive();
        applyReveal();
        return;
      }
      try {
        const flow = activeFlow();
        if (flow === null) {
          clearLive();
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
          clearLive();
          if (candidateFlow !== null && candidateFlow.isConnected) {
            if (flowHidden) candidateFlow.style.setProperty("display", "block", "important");
            // Tool candidates: the inner ToolRow root ([data-tool]) is hidden by the
            // row-level fallback rule, so it must be revealed too — otherwise the
            // forced-visible flow item renders as a blank line.
            if (nextRow !== null && rowHidden) nextRow.style.setProperty("display", "flex", "important");
          }
          liveFlow = candidateFlow;
          liveRow = nextRow;
        }

        applyReveal();
      } catch {
        clearLive();
        clearReveal();
      }
    }

    function scheduleRefresh() {
      if (refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshLive();
      }, 120);
    }

    /** Watch the page for node/state changes and keep the live line current.
        Fully event-driven: childList covers node arrival/removal (including the
        turn-status marker) and the data-state attribute filter covers tool and
        thinking state transitions — no polling interval. */
    function installWatcher() {
      const observer = new MutationObserver(() => {
        scheduleRefresh();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state"],
      });
      return () => {
        observer.disconnect();
        if (refreshTimer !== null) {
          window.clearTimeout(refreshTimer);
          refreshTimer = null;
        }
        clearLive();
        clearReveal();
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

    function apply(ctx) {
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      const locale = ctx.get("locale");

      let t = (key, params) => {
        let text = DICT_EN[key] ?? key;
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
        const [open, setOpen] = React.useState(false);
        const [rev, setRev] = React.useState(0);
        React.useEffect(() => {
          const d1 = subscribeConfig(() => {
            setEnabledNow(enabled);
            setTraceOn(settings.trace);
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
        const label = open
          ? t("traceHide")
          : t("traceProcessed", { steps: String(steps) }) + (secs === null ? "" : " · " + secs);

        const toggle = () => {
          const seatEl = seatRef.current === null ? null : seatRef.current.closest(TURN_TAIL_SELECTOR);
          if (seatEl === null) return;
          const keys = keysOfTurn(seatEl);
          if (open) {
            for (const key of keys) revealedKeys.delete(key);
            setOpen(false);
          } else {
            for (const key of keys) revealedKeys.add(key);
            setOpen(true);
          }
          applyReveal();
        };

        return React.createElement(
          "button",
          {
            type: "button",
            ref: seatRef,
            "aria-expanded": open,
            title: t("traceAria"),
            onClick: toggle,
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
          label + (open ? " ▾" : " ▸"),
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
