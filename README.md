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

## 兼容性

- 基于 DeepSeek Harness Web 配置开发与测试（客户端 bundle rev `052ed3238a98` 时期，2026 年初部署）。
- 隐藏依赖产品 DOM 属性；若未来产品版本更换属性，插件会优雅降级（仅停止隐藏），不影响页面稳定性。
- 对不支持 `:has()` 的浏览器保留行级 CSS 兜底规则。

## 开发

```sh
npm run verify   # 文件完整性、语法、bundle id 一致性、apply 冒烟测试
```
