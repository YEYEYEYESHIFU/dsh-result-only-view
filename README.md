# dsh-result-only-view

[![npm version](https://img.shields.io/npm/v/dsh-result-only-view)](https://www.npmjs.com/package/dsh-result-only-view)
[![license](https://img.shields.io/npm/l/dsh-result-only-view)](./LICENSE)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

A "Results only" toggle for the DeepSeek Harness Web GUI. When enabled, the conversation hides thinking rows, tool-call nodes and context-injection rows, so only user messages and final assistant replies remain visible. Clicking the toggle restores the built-in collapsed-row view; the trajectory view is never affected and stays the full-detail option.

- **Default on**; the preference is remembered in `localStorage`.
- **Live-summary chips while the agent works**: during an active run, every step that is currently running (a tool call or a think block) gets a compact one-line chip — tool name + short args hint, or the latest thinking line. Chips are styled as plain lines (transparent background, no border, native 14px/24px metrics), stream live (they follow the newest content like the native rows) and disappear as soon as the step settles. Clicking a chip (or pressing Enter on it) keeps that step's native row visible and expands it, so the actual arguments/output can be inspected while the step runs. When nothing is running, a single fallback live line shows the latest step of the current turn with native real-time updates.
- **Turn trace line**: after a turn settles, a compact "Processed N steps · Xs ▸" line appears in the turn tail; clicking it reveals that turn's process rows and collapses them again. Hovering a folded turn's trace line peeks at its process rows while your pointer stays in the conversation.
- **Auto / Manual fold mode**: Auto (default) folds a settled turn's process rows automatically; Manual keeps them visible until you fold that turn from its trace line.
- **General settings row**: show/hide the turn trace, choose whether activity animations are restored under `prefers-reduced-motion: reduce`, and pick the fold mode.
- **Interactive cards are never hidden**: `ask_user_question` and `cordis_run` rows stay visible (and never get a chip), and privileged-execution approval prompts render in the composer itself.
- **Localized** through the client locale service: English (`Results only`) and Simplified Chinese (`只看结果`).

## Install

From npm:

```sh
dsh plugin --profile web add dsh-result-only-view
```

Or from a local checkout:

```sh
dsh plugin --profile web add file:<path-to-this-directory>
```

Then restart the web profile (`dsh web`). Uninstall with `dsh plugin --profile web remove dsh-result-only-view` and restart.

## How it works

The plugin registers a small control in the `conversation.input.left` slot and injects a stylesheet targeting stable product DOM attributes (`data-variant="think"`, `data-tool`, `data-chat-flow-kind`, `data-subcalls`), plus a MutationObserver (childList + `data-state` + characterData) that renders live-summary chips for running steps and keeps a fallback live status line visible while a session runs. No product DOM is modified and no network requests are made; only presentation is affected.

## Quick start

```sh
dsh plugin --profile web add dsh-result-only-view
# restart dsh web, then hard-refresh the page (Ctrl+Shift+R)
```

Send any prompt to the agent: while it works you see a live chip per running step (or a single fallback status line); once the turn settles, a "Processed N steps · Xs ▸" trace appears in the turn tail — click it to expand that turn's process rows, or hover it to peek.

## Configuration

- **Composer toggle** (default on; persisted in `localStorage`).
- **Settings → General → Results only**:
  - *Show turn trace* — show/hide the per-turn trace line (default on).
  - *Restore activity animations under reduced motion* — re-enable the turn-status shimmer and running-row sweep when the system prefers reduced motion (default on).
  - *Process fold mode* — `Auto` (default): a settled turn's process rows fold automatically. `Manual`: they stay visible until you fold that turn from its trace line.

## Permissions & data

- Client-side only: no network requests, no filesystem access, no credentials.
- Reads/writes `localStorage` for the toggle state and the three preferences.
- Reads the conversation DOM to hide/reveal rows and to summarize running steps into chips; never modifies the product DOM structure.
- Registers dictionary texts in the client locale service (namespace `resultOnlyView`).

## Troubleshooting

- **Rows stop hiding after a product update** — the product DOM attributes changed; the plugin degrades gracefully (see Compatibility). Report the DSH and plugin versions in an issue.
- **Whitelisted cards missing** — check the "Results only" toggle is on and the card tool name is one of the whitelisted (`ask_user_question`, `cordis_run`).
- **Animations not restored** — the preference may be off; check Settings → General → Results only.
- **Uninstall/rollback** — `dsh plugin --profile web remove dsh-result-only-view` then restart `dsh web`.

## License & security

MIT — see [LICENSE](./LICENSE). To report a security issue privately, please open a GitHub issue with "[security]" in the title.

## Compatibility

- Built and tested against the DeepSeek Harness web profile (client bundles rev `052ed3238a98` era, early-2026 deployment).
- Hiding relies on product DOM attributes; if a future product release changes them, the plugin degrades gracefully (rows simply stop hiding) without affecting page stability.
- Row-level CSS rules act as a fallback for browsers without `:has()` support.

## Development

```sh
npm run verify   # files, syntax, bundle-id match, and an apply smoke test
```

# dsh-result-only-view

[![npm version](https://img.shields.io/npm/v/dsh-result-only-view)](https://www.npmjs.com/package/dsh-result-only-view)
[![license](https://img.shields.io/npm/l/dsh-result-only-view)](./LICENSE)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

DeepSeek Harness Web 的「只看结果」开关。开启后，对话隐藏思考行与工具调用节点，只保留用户消息与最终回复；点击开关可恢复官方单行折叠视图，「轨迹」视图不受影响、可随时查看完整过程。

- **默认开启**，偏好保存在 `localStorage`。
- **运行中的实时摘要芯片**：会话运行期间，每个正在进行的步骤（工具调用或思考块）显示一枚紧凑的单行摘要芯片——工具名 + 简短参数提示，或思考的最新一行。芯片采用与原生折叠行一致的朴素单行样式（透明底、无边框、原生 14px/24px 排版），随流式内容实时更新（与原生行一致地贴住最新内容），步骤结束立即消失；没有运行中步骤时，退化为显示本回合最新一步的单行实时状态。
- **回合痕迹行**：回合结束后，在回合尾部显示「已处理 N 步 · Xs ▸」，点击展开该回合的过程行，再次点击收起；鼠标悬停折叠回合的痕迹行可临时预览其过程行。
- **自动 / 手动折叠方式**：自动（默认）在回合结束后自动折叠过程行；手动保留过程行，由你点击该回合尾部的「收起过程」再折叠。
- **设置面板**：在「常规」设置中可开关痕迹行、选择是否在系统「减少动态效果」下恢复活动光影，以及选择过程折叠方式。
- **交互卡片永不隐藏**：`ask_user_question` 与 `cordis_run` 行始终可见（也不会生成芯片）；越权审批提示渲染在输入框位置，不会受影响。
- **多语言**：通过客户端 locale 服务提供英文（`Results only`）与简体中文（`只看结果`）。

## 安装

从 npm：

```sh
dsh plugin --profile web add dsh-result-only-view
```

或从本地目录：

```sh
dsh plugin --profile web add file:<本目录路径>
```

然后重启 Web 配置（`dsh web`）。卸载：`dsh plugin --profile web remove dsh-result-only-view`，再重启。

## 原理

插件在 `conversation.input.left` 插槽注册一个小组件，并注入针对稳定 DOM 属性（`data-variant="think"`、`data-tool`、`data-chat-flow-kind`、`data-subcalls`）的样式表，同时用 MutationObserver（childList + `data-state` + characterData）为运行中的步骤渲染实时摘要芯片，并在没有运行中步骤时维持一条兜底实时状态行。不改动任何产品 DOM、不发任何网络请求，只影响展示层。

## 快速开始

```sh
dsh plugin --profile web add dsh-result-only-view
# 重启 dsh web，然后硬刷新页面（Ctrl+Shift+R）
```

给 Agent 发任意消息：运行期间你会看到每个进行中步骤的实时摘要芯片（或一条兜底状态行）；回合结束后，回合尾部出现「已处理 N 步 · Xs ▸」痕迹行，点击即可展开该回合的过程行，悬停可临时预览。

## 配置

- **输入框开关**（默认开启；持久化到 `localStorage`）。
- **设置 → 常规 → 只看结果**：
  - *显示过程痕迹行* — 开关回合痕迹行（默认开）。
  - *减少动态效果下仍恢复活动光影* — 系统开启「减少动态效果」时恢复光影动画（默认开）。
  - *过程折叠方式* — `自动`（默认）：回合结束后自动折叠过程行。`手动`：保留过程行，由你点击该回合尾部的痕迹行折叠。

## 权限与数据

- 纯客户端：无网络请求、不访问文件系统、不接触凭据。
- 仅在 `localStorage` 读写开关状态与三项偏好。
- 只读取对话 DOM 以隐藏/显示行，并读取运行中步骤以生成摘要芯片；不修改产品 DOM 结构。
- 在客户端 locale 服务中注册词典（命名空间 `resultOnlyView`）。

## 故障排查

- **产品升级后行不再隐藏** — 产品 DOM 属性已变化；插件会优雅降级（见「兼容性」）。请在 issue 中附上 DSH 与插件版本。
- **白名单卡片不见了** — 确认「只看结果」开关已开启，且卡片工具名在名单内（`ask_user_question`、`cordis_run`）。
- **光影未恢复** — 可能该偏好已关闭；检查 设置 → 常规 → 只看结果。
- **卸载/回滚** — `dsh plugin --profile web remove dsh-result-only-view`，然后重启 `dsh web`。

## 许可证与安全

MIT — 见 [LICENSE](./LICENSE)。如需私下报告安全问题，请以「[security]」为标题开头提交 GitHub issue。

## 兼容性

- 基于 DeepSeek Harness Web 配置开发与测试（客户端 bundle rev `052ed3238a98` 时期，2026 年初部署）。
- 隐藏依赖产品 DOM 属性；若未来产品版本更换属性，插件会优雅降级（仅停止隐藏），不影响页面稳定性。
- 对不支持 `:has()` 的浏览器保留行级 CSS 兜底规则。

## 开发

```sh
npm run verify   # 文件完整性、语法、bundle id 一致性、apply 冒烟测试
```
