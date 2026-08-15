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
// The "working" shimmer on the turn-status line and the sweep on the live
// running row are re-enabled while Results only is on (the product disables
// them under prefers-reduced-motion).
//
// Whitelist (always visible, interactive cards):
//   - ask_user_question  (the user must answer)
//   - cordis_run         (package approval / run card)
// Approval prompts for privileged execution render in the composer itself
// (ApprovalPanel), so they are never hidden by this plugin.
//
// Buttons and tooltips are localized through the client locale service
// (namespace resultOnlyView, zh-CN / zh / en). The toggle state is persisted
// in localStorage so a user preference survives reloads.

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

    const HIDE_CSS = `
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
    };
    const DICT_EN = {
      label: "Results only",
      onText: "◉ Results only",
      offText: "○ Results only",
      titleOn: "Results only is on: process steps are hidden, with one live line preferring the latest tool call of the current turn (question and plugin approval cards stay visible). Click to show the full collapsed process.",
      titleOff: "Results only is off: thinking and tool calls show as collapsed rows. Click to hide the process.",
    };

    const FLOW_SELECTOR = "div[data-chat-flow]";
    const TOOL_ITEM_SELECTOR = '[data-chat-flow-kind="tool-call"]';
    const THINK_ROW_SELECTOR = '[data-variant="think"]';
    const TURN_TAIL_SELECTOR = '[data-chat-flow-kind="turn-tail"]';

    /** Insert the hide stylesheet as a plugin-tagged style element (product pattern). */
    function insertHideCss() {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-result-only-view";
      tag.dataset.pluginCss = "result-only-hide";
      tag.textContent = HIDE_CSS;
      document.head.appendChild(tag);
      return () => {
        tag.remove();
      };
    }

    function readStored() {
      try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        return value === null ? true : value === "1";
      } catch {
        return true;
      }
    }

    function storeEnabled(enabled) {
      try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
      } catch {
        /* storage unavailable — preference lives for this page load only */
      }
    }

    // ---- live-line management -------------------------------------------
    let enabled = true;
    let liveFlow = null; // flow item element currently forced visible
    let liveRow = null; // inner row element currently forced visible (think or tool row)
    let refreshTimer = null;

    function clearLive() {
      if (liveFlow !== null && liveFlow.isConnected) liveFlow.style.removeProperty("display");
      if (liveRow !== null && liveRow.isConnected) liveRow.style.removeProperty("display");
      liveFlow = null;
      liveRow = null;
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

    /** Pick and reveal the single live line; hide it when the turn is not running. */
    function refreshLive() {
      if (!enabled) {
        clearLive();
        return;
      }
      try {
        const flow = activeFlow();
        if (flow === null) {
          clearLive();
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
        if (candidateFlow === liveFlow && nextRow === liveRow) return;

        clearLive();
        if (candidateFlow === null || !candidateFlow.isConnected) return;
        if (flowHidden) candidateFlow.style.setProperty("display", "block", "important");
        // Tool candidates: the inner ToolRow root ([data-tool]) is hidden by the
        // row-level fallback rule, so it must be revealed too — otherwise the
        // forced-visible flow item renders as a blank line.
        if (nextRow !== null && rowHidden) nextRow.style.setProperty("display", "flex", "important");
        liveFlow = candidateFlow;
        liveRow = nextRow;
      } catch {
        clearLive();
      }
    }

    function scheduleRefresh() {
      if (refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshLive();
      }, 120);
    }

    /** Watch the page for node/state changes and keep the live line current. */
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
      const intervalId = window.setInterval(() => {
        refreshLive();
      }, 800);
      return () => {
        observer.disconnect();
        window.clearInterval(intervalId);
        if (refreshTimer !== null) {
          window.clearTimeout(refreshTimer);
          refreshTimer = null;
        }
        clearLive();
      };
    }

    function apply(ctx) {
      const slots = ctx.get("slots");
      if (slots === undefined) return;
      const locale = ctx.get("locale");

      let t = (key) => DICT_EN[key] ?? key;
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

      enabled = readStored();
      ctx.effect(installWatcher);

      function ResultOnlyToggle() {
        const [on, setOn] = React.useState(enabled);
        const [rev, setRev] = React.useState(0);
        React.useEffect(() => {
          if (locale === undefined) return;
          return locale.subscribe(() => setRev((v) => v + 1));
        }, []);
        React.useEffect(() => {
          if (!on) {
            clearLive();
            return;
          }
          const dispose = insertHideCss();
          scheduleRefresh();
          return dispose;
        }, [on]);

        const toggle = () => {
          enabled = !enabled;
          setOn(enabled);
          storeEnabled(enabled);
          if (!enabled) clearLive();
          else scheduleRefresh();
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

      slots.inject("conversation.input.left", () =>
        slots.register(
          { name: "conversation.input.left", id: "result-only-toggle", order: 0, label: () => t("label") },
          ResultOnlyToggle,
        ),
      );
    }

    exports.apply = apply;
    return module.exports;
  },
});
