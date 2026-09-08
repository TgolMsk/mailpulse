import { loadState } from '../state'
import type { StoredMail } from '../state'
import { escapeHtml, formatMailMessage, TelegramNotifier } from './telegram'
import type { PushMail } from './telegram'

/** 把本地完整邮件格式化成 Telegram 消息（「查看原邮件」后的完整内容） */
export function formatFullMail(mail: StoredMail): string {
  const lines: string[] = []
  lines.push(`📧 <b>${escapeHtml(mail.subject)}</b>`)
  lines.push(`👤 发件人：${escapeHtml(mail.from)}`)
  lines.push(`🕐 时间：${escapeHtml(mail.date)}`)
  lines.push('')
  const body = (mail.text || '(无正文)').slice(0, 3500)
  lines.push(escapeHtml(body))
  return lines.join('\n')
}

/** 从本地邮件还原摘要消息所需的数据（「关闭原邮件」时换回摘要） */
function toPushMail(mail: StoredMail): PushMail {
  return {
    name: mail.name,
    email: mail.email,
    from: mail.from,
    subject: mail.subject,
    summary: mail.extracted?.summary ?? '',
    category: mail.extracted?.category ?? '其他',
    urgency: mail.extracted?.urgency ?? 'low',
    todos: mail.extracted?.todos ?? [],
    amount: mail.extracted?.entities?.amount
  }
}

/**
 * 长轮询处理 Telegram callback query：
 * - view|accountId|uid：查看原邮件 → 换成完整内容 + 「关闭原邮件」按钮
 * - close|accountId|uid：关闭原邮件 → 换回摘要 + 「查看原邮件」按钮
 */
export function startCallbackLoop(notifier: TelegramNotifier): () => void {
  let stopped = false
  let offset = 0

  const loop = async (): Promise<void> => {
    while (!stopped) {
      try {
        const updates = await notifier.getUpdates(offset, 30)
        for (const upd of updates) {
          offset = upd.update_id + 1
          const cq = upd.callback_query
          if (!cq || !cq.message || !cq.data) continue

          try {
            const parts = cq.data.split('|')
            const action = parts[0]
            const accountId = parts[1]
            const uid = Number(parts[2])

            const state = loadState()
            const mail = state.mails.find((m) => m.accountId === accountId && m.uid === uid)
            if (!mail) continue

            const chatId = cq.message.chat.id
            const messageId = cq.message.message_id

            if (action === 'view') {
              await notifier.editMessageText(chatId, messageId, formatFullMail(mail), {
                inline_keyboard: [
                  [{ text: '📕 关闭原邮件', callback_data: `close|${accountId}|${uid}` }]
                ]
              })
            } else if (action === 'close') {
              await notifier.editMessageText(chatId, messageId, formatMailMessage(toPushMail(mail)), {
                inline_keyboard: [
                  [{ text: '📖 查看原邮件', callback_data: `view|${accountId}|${uid}` }]
                ]
              })
            }
          } catch (err) {
            console.error('[callback]', (err as Error).message)
          }
          await notifier.answerCallbackQuery(cq.id).catch(() => {})
        }
      } catch {
        // 长轮询超时或网络错误，稍后重试
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  void loop()
  return () => {
    stopped = true
  }
}
