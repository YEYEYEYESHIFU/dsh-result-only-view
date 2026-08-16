# dsh-result-only-view

[![npm version](https://img.shields.io/npm/v/dsh-result-only-view)](https://www.npmjs.com/package/dsh-result-only-view)
[![license](https://img.shields.io/npm/l/dsh-result-only-view)](./LICENSE)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

A "Results only" toggle for the DeepSeek Harness Web GUI. When enabled, the conversation hides thinking rows and tool-call nodes, so only user messages and final assistant replies remain visible. Clicking the toggle restores the built-in collapsed-row view; the trajectory view is never affected and stays the full-detail option.

- **Default on**; the preference is remembered in `localStorage`.
- **One live status line while the agent works**: during an active run, only the latest step of the current turn (running tool row, else the last tool row, else the streaming thinking row) is shown with native real-time updates; it disappears when the run settles.
- **Turn trace line**: after a turn settles, a compact "Processed N steps · Xs ▸" line appears in the turn tail; clicking it reveals that turn's process rows and collapses them again.
- **General settings row**: show/hide the turn trace, and choose whether activity animations are restored under `prefers-reduced-motion: reduce`.
- **Interactive cards are never hidden**: `ask_user_question` and `cordis_run` rows stay visible, and privileged-execution approval prompts render in the composer itself.
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

The plugin registers a small control in the `conversation.input.left` slot and injects a stylesheet targeting stable product DOM attributes (`data-variant="think"`, `data-tool`, `data-chat-flow-kind`, `data-subcalls`), plus a MutationObserver that keeps exactly one live status line visible while a session runs. No product DOM is modified and no network requests are made; only presentation is affected.

## Quick start

```sh
dsh plugin --profile web add dsh-result-only-view
# restart dsh web, then hard-refresh the page (Ctrl+Shift+R)
```

Send any prompt to the agent: while it works you see one live status line; once the turn settles, a "Processed N steps · Xs ▸" trace appears in the turn tail — click it to expand that turn's process rows.

## Configuration

- **Composer toggle** (default on; persisted in `localStorage`).
- **Settings → General → Results only**:
  - *Show turn trace* — show/hide the per-turn trace line (default on).
  - *Restore activity animations under reduced motion* — re-enable the turn-status shimmer and running-row sweep when the system prefers reduced motion (default on).

## Permissions & data

- Client-side only: no network requests, no filesystem access, no credentials.
- Reads/writes `localStorage` for the toggle state and the two preferences.
- Reads the conversation DOM to hide/reveal rows; never modifies the product DOM structure.
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
- **运行中仅显示一条实时状态行**：会话运行期间只展示本回合最新一步（正在执行的工具行 / 上一条工具行 / 正在流式输出的思考行），原生实时刷新；运行结束后自动收起。
- **回合痕迹行**：回合结束后，在回合尾部显示「已处理 N 步 · Xs ▸」，点击展开该回合的过程行，再次点击收起。
- **设置面板**：在「常规」设置中可开关痕迹行、选择是否在系统「减少动态效果」下恢复活动光影。
- **交互卡片永不隐藏**：`ask_user_question` 与 `cordis_run` 行始终可见；越权审批提示渲染在输入框位置，不会受影响。
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

插件在 `conversation.input.left` 插槽注册一个小组件，并注入针对稳定 DOM 属性（`data-variant="think"`、`data-tool`、`data-chat-flow-kind`、`data-subcalls`）的样式表，同时用 MutationObserver 维持运行期间的唯一实时状态行。不改动任何产品 DOM、不发任何网络请求，只影响展示层。

## 快速开始

```sh
dsh plugin --profile web add dsh-result-only-view
# 重启 dsh web，然后硬刷新页面（Ctrl+Shift+R）
```

给 Agent 发任意消息：运行期间你会看到一条实时状态行；回合结束后，回合尾部出现「已处理 N 步 · Xs ▸」痕迹行，点击即可展开该回合的过程行。

## 配置

- **输入框开关**（默认开启；持久化到 `localStorage`）。
- **设置 → 常规 → 只看结果**：
  - *显示过程痕迹行* — 开关回合痕迹行（默认开）。
  - *减少动态效果下仍恢复活动光影* — 系统开启「减少动态效果」时恢复光影动画（默认开）。

## 权限与数据

- 纯客户端：无网络请求、不访问文件系统、不接触凭据。
- 仅在 `localStorage` 读写开关状态与两项偏好。
- 只读取对话 DOM 以隐藏/显示行；不修改产品 DOM 结构。
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
