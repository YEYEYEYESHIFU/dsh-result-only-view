# dsh-result-only-view

[![npm version](https://img.shields.io/npm/v/dsh-result-only-view)](https://www.npmjs.com/package/dsh-result-only-view)
[![license](https://img.shields.io/npm/l/dsh-result-only-view)](./LICENSE)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

[English](#english) · [简体中文](#简体中文)

## English

A **Results only** toggle for the DeepSeek Harness Web GUI. Turn it on and thinking, tool-call and context-injection rows fold away — only your messages and the final replies remain. Open any of them again whenever you want the details.

- Default on; the state persists in `localStorage`.
- **While the agent runs** — one compact chip per running step (tool name + args hint, or the latest thinking line). Click a chip to reveal and expand that step's native row mid-run. With no active step, a single live status line shows the latest one.
- **After a turn settles** — a `Processed N steps · Xs ▸` trace appears at the turn tail: click to expand that turn's process rows; click again to fold them back. Moving the mouse across the line does nothing — expansion is strictly click-driven.
- **Fold modes** — Auto folds settled turns for you; Manual keeps them visible until you fold them from the trace line.
- **Never hidden** — whitelisted interactive cards (`ask_user_question`, `cordis_run`) and composer approval prompts stay visible.
- Settings → General → Results only: show/hide the trace, restore animations under reduced motion, pick the fold mode. zh-CN/en localized.

### Install

```sh
dsh plugin --profile web add dsh-result-only-view
```

Then restart `dsh web`. Uninstall with `dsh plugin --profile web remove dsh-result-only-view` + restart.

### Notes

- Client-side only: no network requests, no filesystem access, no credentials. Reads/writes `localStorage` and reads the conversation DOM read-only — the product DOM is never modified.
- Hiding relies on stable product DOM attributes plus a MutationObserver for chips. If a DSH update changes the attributes, the plugin degrades gracefully (rows stop hiding) — please report DSH + plugin versions in an issue.
- Row-level CSS fallbacks cover browsers without `:has()`.

## 简体中文

DeepSeek Harness Web 的「只看结果」开关。开启后思考行、工具调用行与上下文注入行全部折叠——对话里只剩你的消息和最终回复；需要细节时随时点开。

- 默认开启，状态保存在 `localStorage`。
- **Agent 运行中**：每个进行中的步骤显示一枚摘要芯片（工具名 + 参数提示，或最新一行思考）。点击芯片可立即展开该步骤的原生行查看参数与输出；没有运行中步骤时显示一条实时状态行。
- **回合结束后**：回合尾部出现「已处理 N 步 · Xs ▸」，点击展开该回合的过程行，再次点击收起。鼠标滑过该行不会有任何反应——只有点击才会展开。
- **折叠方式**：自动——回合结束后自动折叠过程行；手动——保留过程行，由你点击痕迹行折叠。
- **永不隐藏**：白名单交互卡片（`ask_user_question`、`cordis_run`）与输入框审批提示始终可见。
- 设置 → 常规 → 只看结果：开关痕迹行、减少动态效果下恢复动画、选择折叠方式。中英双语。

### 安装

```sh
dsh plugin --profile web add dsh-result-only-view
```

然后重启 `dsh web`。卸载用 `dsh plugin --profile web remove dsh-result-only-view` 再重启。

### 说明

- 纯客户端：无网络请求、不访问文件系统、不接触凭据；仅读写 `localStorage` 并只读对话 DOM，不改产品 DOM 结构。
- 隐藏依赖稳定的产品 DOM 属性并用 MutationObserver 渲染芯片；若产品升级改动属性会优雅降级（停止隐藏），请在 issue 中附上双方版本。
- 对不支持 `:has()` 的浏览器保留行级 CSS 兜底。

## License

MIT — see [LICENSE](./LICENSE). Security issues: open a GitHub issue titled `[security]`.
