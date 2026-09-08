import { loadConfig } from './config'
import { createProviders } from './mail'
import type { RawEmail } from './mail/types'
import { AIExtractor } from './ai/extractor'
import { loadState, saveState, getLastUid, setLastUid, addMails, type StoredMail } from './state'
import { TelegramNotifier, formatMailMessage } from './notify/telegram'

export interface PollerCallbacks {
  onNewMail: (items: StoredMail[]) => void
  onError: (msg: string) => void
}

/**
 * 跑一轮同步：
 * - 账号首次处理：回溯拉取最近 lookbackHours 小时的邮件
 * - 已处理过：增量拉取 UID > lastUid 的新邮件
 * 拉取后 → AI 提取 → 保存本地（完整正文）→ Telegram 推送 → 推进 lastUid。
 */
export async function syncOnce(callbacks: PollerCallbacks): Promise<StoredMail[]> {
  const config = loadConfig()
  if (config.accounts.length === 0) return []

  const extractor = config.ai?.apiKey
    ? new AIExtractor({ apiKey: config.ai.apiKey, baseUrl: config.ai.baseUrl, model: config.ai.model })
    : null

  const notifier = config.telegram?.botToken
    ? new TelegramNotifier({ botToken: config.telegram.botToken, chatId: config.telegram.chatId })
    : null

  const lookbackHours = config.poll?.lookbackHours ?? 8

  const state = loadState()
  const providers = createProviders(config)
  const newMails: StoredMail[] = []

  for (const p of providers) {
    try {
      await p.connect()
      const maxUid = await p.getMaxUid()
      const lastUid = getLastUid(state, p.id)

      let mails: RawEmail[]
      if (lastUid === undefined) {
        const since = new Date(Date.now() - lookbackHours * 3600 * 1000)
        mails = await p.fetchSinceDate(since)
      } else if (maxUid > lastUid) {
        mails = await p.fetchSince(lastUid)
      } else {
        mails = []
      }

      for (const m of mails) {
        let extracted
        if (extractor) {
          try {
            extracted = await extractor.extract({ from: m.from, subject: m.subject, text: m.text })
          } catch (err) {
            console.error(`[sync] AI 提取失败 uid=${m.uid}:`, (err as Error).message)
          }
        }

        // 本地已存在（之前处理过）则跳过推送，降低重复推送
        const alreadyProcessed = state.mails.some((sm) => sm.accountId === p.id && sm.uid === m.uid)

        newMails.push({
          accountId: p.id,
          email: p.email,
          name: p.name,
          uid: m.uid,
          messageId: m.messageId,
          from: m.from,
          subject: m.subject,
          date: m.internalDate.toISOString(),
          text: m.text,
          html: m.html || undefined,
          extracted,
          processedAt: new Date().toISOString()
        })

        // Telegram 推送（带「查看原邮件」按钮）
        if (notifier && !alreadyProcessed) {
          try {
            const msg = formatMailMessage({
              name: p.name,
              email: p.email,
              from: m.from,
              subject: m.subject,
              summary: extracted?.summary ?? '',
              category: extracted?.category ?? '其他',
              urgency: extracted?.urgency ?? 'low',
              todos: extracted?.todos ?? [],
              amount: extracted?.entities?.amount
            })
            await notifier.send(msg, {
              inline_keyboard: [[{ text: '📖 查看原邮件', callback_data: `view|${p.id}|${m.uid}` }]]
            })
          } catch (err) {
            console.error(`[notify] 推送失败 uid=${m.uid}:`, (err as Error).message)
          }
        }
      }
      setLastUid(state, p.id, maxUid)
      await p.disconnect()
    } catch (err) {
      await p.disconnect().catch(() => {})
      callbacks.onError(`${p.name}(${p.email}): ${(err as Error).message}`)
    }
  }

  addMails(state, newMails)
  saveState(state)
  return newMails
}

/** 后台自动轮询引擎，返回 stop / runNow 控制句柄 */
export function startPoller(intervalSeconds: number, callbacks: PollerCallbacks): {
  stop: () => void
  runNow: () => void
} {
  let running = false

  const tick = async (): Promise<void> => {
    if (running) return
    running = true
    try {
      const items = await syncOnce(callbacks)
      if (items.length > 0) callbacks.onNewMail(items)
    } finally {
      running = false
    }
  }

  void tick()
  const timer = setInterval(() => void tick(), intervalSeconds * 1000)

  return {
    stop: () => clearInterval(timer),
    runNow: () => void tick()
  }
}
