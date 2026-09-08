# MailPulse — AI 邮件助手

接收邮箱新邮件 → AI 提取结构化内容 → 推送到 Telegram 的 macOS 桌面客户端。

## 功能

- **多邮箱平台**：Gmail / QQ 邮箱，支持同平台多账户，动态增删
- **自动拉取**：后台轮询 + 增量拉取，首次可回溯最近 N 小时
- **AI 提取**：DeepSeek（OpenAI 兼容接口，可换任意服务），输出摘要 / 分类 / 紧急度 / 待办 / 关键实体
- **本地持久化**：完整正文 + HTML 存本地，二次打开直接加载
- **Telegram 推送**：HTML 卡片 +「查看原邮件 / 关闭原邮件」按钮切换
- **桌面界面**：深色金融科技风（深蓝黑 + 靛蓝强调），双击邮件弹窗查看完整 HTML 内容

## 技术栈

Electron · React · TypeScript · Tailwind CSS · electron-vite · imapflow · mailparser · openai

## 运行

```bash
pnpm install
pnpm dev        # 开发模式
pnpm typecheck  # 类型检查
pnpm build      # 构建
```

## 配置

在设置界面配置邮箱账号、大模型、Telegram、轮询；或直接编辑 `config.json`（已 gitignore，含凭证不入库）。

| 配置项 | 说明 |
|---|---|
| 邮箱 | QQ 授权码 / Gmail App 专用密码 |
| 模型 | OpenAI 兼容 baseUrl + model + apiKey |
| Telegram | Bot Token + Chat ID |
| 轮询 | 间隔秒数 + 首次回溯小时数 |

## 目录

```
src/main       Electron 主进程（IMAP 拉取、AI 提取、Telegram 推送、后台轮询）
src/preload    IPC 桥
src/renderer   React 界面
scripts        独立验证脚本（fetch / ai / e2e / telegram）
```
