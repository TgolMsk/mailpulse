export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface PushMail {
  name: string
  email: string
  from: string
  subject: string
  summary: string
  category: string
  urgency: string
  todos: string[]
  amount?: string
}

const URGENCY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

/** HTML 转义动态内容，避免 `<xxx@yyy.com>` 之类被 Telegram 当作标签解析 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 把邮件 + AI 提取结果格式化成 Telegram 消息（HTML parse_mode） */
export function formatMailMessage(mail: PushMail): string {
  const lines: string[] = []
  lines.push(`📬 <b>新邮件</b> · ${escapeHtml(mail.name)}`)
  lines.push('')
  lines.push(`<b>发件人</b>：${escapeHtml(mail.from)}`)
  lines.push(`<b>主题</b>：${escapeHtml(mail.subject)}`)
  if (mail.summary) {
    lines.push('')
    lines.push(`<b>摘要</b>：${escapeHtml(mail.summary)}`)
  }
  const urgencyLabel = URGENCY_LABEL[mail.urgency] ?? mail.urgency
  lines.push('')
  lines.push(`🏷 ${escapeHtml(mail.category)} ｜ ⚡ 紧急度：${escapeHtml(urgencyLabel)}`)
  if (mail.amount) {
    lines.push(`💰 金额：${escapeHtml(mail.amount)}`)
  }
  if (mail.todos.length > 0) {
    lines.push('')
    lines.push(`💡 <b>待办</b>：${escapeHtml(mail.todos.join('；'))}`)
  }
  return lines.join('\n')
}

export interface TelegramUpdate {
  update_id: number
  callback_query?: {
    id: string
    data?: string
    message?: { message_id: number; chat: { id: number | string } }
  }
}

/** Telegram Bot 客户端（官方 Bot API，用内置 fetch，无需额外依赖） */
export class TelegramNotifier {
  private botToken: string
  private chatId: string

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken
    this.chatId = config.chatId
  }

  /** 发送消息，可带 inline keyboard */
  async send(text: string, replyMarkup?: object): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
    const body: Record<string, unknown> = {
      chat_id: this.chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    if (replyMarkup) body.reply_markup = replyMarkup
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!resp.ok) {
      const b = await resp.text()
      throw new Error(`Telegram 发送失败 (${resp.status}): ${b.slice(0, 200)}`)
    }
  }

  /** 编辑已发送的消息（用于「查看/关闭原邮件」点击后替换内容与按钮） */
  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    replyMarkup?: object
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/editMessageText`
    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }
    if (replyMarkup) body.reply_markup = replyMarkup
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!resp.ok) {
      const b = await resp.text()
      throw new Error(`editMessageText 失败 (${resp.status}): ${b.slice(0, 200)}`)
    }
  }

  /** 长轮询拉取更新（只关注 callback_query） */
  async getUpdates(offset: number, timeout: number): Promise<TelegramUpdate[]> {
    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`
    const params = new URLSearchParams({
      offset: String(offset),
      timeout: String(timeout),
      allowed_updates: JSON.stringify(['callback_query'])
    })
    const resp = await fetch(`${url}?${params.toString()}`)
    if (!resp.ok) {
      throw new Error(`getUpdates 失败 (${resp.status})`)
    }
    const data = (await resp.json()) as { ok: boolean; result?: TelegramUpdate[] }
    return data.ok ? (data.result ?? []) : []
  }

  /** 应答 callback query（关闭按钮 loading 状态） */
  async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId })
    })
  }
}
