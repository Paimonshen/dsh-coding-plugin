# dsh-coding-plugin · 代码学习插件

[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

一个面向编程学习者的 **DSH 动态 Cordis 插件**：右侧悬浮窗集成代码编辑器、多语言执行、课程关卡评判、进度追踪、笔记与片段库；代码分析**直投当前对话**，由对话主模型直接输出，全程中文界面、深浅色自适应。

> 适用环境：DeepSeek Harness（DSH）桌面版，支持动态 Cordis 插件的会话。

## 功能一览

| 功能 | 说明 |
| --- | --- |
| 右侧悬浮窗 | 会话内输入 `/coding` 激活，右下角「🧩」按钮展开 7 页签面板，可拖拽 / 八向缩放 |
| 代码执行 | Python / JavaScript / TypeScript / PowerShell，输出 stdout / stderr / 退出码 / 耗时；打开面板自动预热解释器 |
| 一体式结果卡 | 状态头（退出码·耗时，成功绿 / 失败红）+ 输出体上下分区，stdout 与 stderr 同卡展示 |
| 课程系统 | 导入 JSON 课程包；关卡自动评判（包含 / 等于 / 不包含）；提供提示与参考答案 |
| 进度追踪 | 关卡状态、完成时间、尝试次数；导出 JSON / Markdown 落盘工作区 |
| 笔记 | Markdown 笔记，可关联关卡 |
| 片段库 | 保存 / 复制代码片段 |
| 分析直投对话 | 点「📨 分析(发到对话)」→ 代码+问题作为用户消息进入**当前会话**，由对话主模型直接输出分析，严格会话对应 |
| 会话门控 | 每个会话独立激活（`/coding` 开、`/coding close` 关），互不影响 |
| 模型工具 | 注册 `coding_run / coding_submit / coding_progress / coding_note / coding_lesson / coding_snippet / coding_analyze` 7 个工具供对话调用 |
| 动效 | 开合动画对称（上浮入场 / 下沉出场）、按压反馈、成功弹跳 / 失败抖动、`prefers-reduced-motion` 回退 |

## 安装

仓库声明了 `dsh.bundle` 清单，可用 DSH 插件管理器直接安装：

```bash
dsh plugin add Paimonshen/dsh-coding-plugin
```

或在 DSH 对话中直接让我「安装 dsh-coding-plugin 并启用」。

## 使用方法（DSH 内）

1. **激活**：会话内输入 `/coding` —— 打开本会话悬浮窗并注入使用指导；`/coding close` 关闭。
2. **运行代码**：编辑器页选择语言 → 编写 → 「▶ 运行」；stdin 可选。
3. **分析代码**：编辑器页点「📨 分析(发到对话)」—— 切回聊天即可看到对话主模型的分析回复。
4. **课程**：课程页粘贴 `examples/course-sample.json` 内容导入 → 课程关卡页提交解答自动评判 → 进度页导出。
5. **对话内使用**：直接说「用 python 跑这段代码 / 提交关卡 / 导出进度 / 记笔记 / 分析这段代码」，我会调用对应 `coding_*` 工具。

## 目录结构

```
dsh-coding-plugin/
├── src/client/
│   ├── fw.js        # 框架层：主题令牌 T / 内核 K（RPC+轮询）/ 原语 P / 流式组件 / useRun
│   └── app.js       # 应用层：7 个页签工厂 + TABS 注册表 + 悬浮窗外壳
├── source/          # 构建产物（发布用）：client.js / host.js
├── tools/
│   ├── build.js     # 构建：合并折叠 + JSON 安全校验 + 双半边语法校验
│   └── make_syntax_check.js
└── examples/
    └── course-sample.json
```

## 在 DSH 中加载

插件为双半边纯 JS（无构建器转换）：

1. `node tools/build.js` 生成 `source/client.js` 与 `source/host.js`；
2. 在 DSH 对话中让我通过 `cordis_define`（`kind: "new"`, `idPrefix: "coding"`）定义插件：`code.host` ← `source/host.js`，`code.client` ← `source/client.js`；
3. `cordis_run` 激活（首次 `run`）；
4. 输入 `/coding` 开始使用。

> 注意：动态插件**不跨 DSH 进程重启**——重启后需重新 `cordis_define` + `cordis_run`（仓库源码随时可重建）。

## 源码约定（改代码必读）

- `src/client/*.js` 源码只允许**单引号与反引号**：禁止双引号、反斜杠、行注释（`//`）——构建产物需可无损嵌入 `cordis_define` 的 JSON 参数，构建脚本会校验（JSON-SAFE FAIL 即失败）；
- Client 沙箱**禁用原生定时器**：一律用 Cordis `timer` 服务（`timer.timeout(cb,ms)` / `timer.interval(cb,ms)` → disposer）；
- 非阻塞执行：Host 用 `shell.start` → `await proc.done` → `proc.readOutput()` 采增量；**禁用阻塞的 `shell.run`**；
- 页签新增：在 `app.js` 的 `TABS` 数组加一条 `{ key, label, make }`，`make(F)` 返回 React 组件即可（`F` 提供 `h/T/K/P/useRun/...`）。

## 数据与权限

- 用户数据仅存当前工作区 `.dsh-coding/`（state.json、导出的 progress.json/md），不出本地；
- 代码执行沿用 DSH 沙箱策略（通常 `workspace-write`），命令超时 20s。

## 已知边界

- 动态插件随进程重启丢失，需重新定义激活（一次性操作）；
- 分析直投对话要求目标会话处于运行状态；会话已关闭时会返回可读错误；
- `--experimental-strip-types` 依赖 Node ≥22.6 的 TS 直接执行能力。

## License

[MIT](./LICENSE)
