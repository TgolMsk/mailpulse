import { ipcMain } from 'electron'
import { loadConfig, saveConfig } from './config'
import type { AccountConfig, AIConfig, PollConfig, TelegramConfig } from './config'
import { createProviders } from './mail'
import { PROVIDERS } from './mail/providers'
import type { ProviderKind } from './mail/types'
import { AIExtractor } from './ai/extractor'
import { loadState } from './state'
import { syncOnce } from './poller'

export interface FetchedMail {
  uid: number
  messageId: string
  from: string
  subject: string
  date: string
  text: string
  attachments: { filename: string; size: number }[]
  extracted?: {
    summary: string
    category: string
    urgency: 'high' | 'medium' | 'low'
    todos: string[]
    entities: { amount?: string; dates?: string[]; people?: string[] }
  }
}

export interface FetchedAccount {
  id: string
  email: string
  provider: ProviderKind
  account: string
  mails: FetchedMail[]
  error?: string
}

export interface AccountSummary {
  id: string
  email: string
  provider: ProviderKind
  name: string
  icon: string
  iconBg: string
}

export function registerIpc(): void {
  // ---------- 邮箱 ----------
  ipcMain.handle('mail:accounts', (): AccountSummary[] => {
    const config = loadConfig()
    return config.accounts.map((a) => {
      const spec = PROVIDERS[a.provider]
      return {
        id: a.id,
        email: a.email,
        provider: a.provider,
        name: spec.name,
        icon: spec.icon,
        iconBg: spec.iconBg
      }
    })
  })

  // 本地已保存的邮件历史
  ipcMain.handle('mail:history', () => loadState().mails)

  // 立即同步一轮（拉新邮件 → 保存），返回新邮件
  ipcMain.handle('mail:sync', async () => {
    return syncOnce({
      onNewMail: () => {},
      onError: (msg) => console.error('[sync]', msg)
    })
  })

  // 拉最近 10 封实时预览（不写入历史）
  ipcMain.handle('mail:fetch', async (): Promise<FetchedAccount[]> => {
    const config = loadConfig()
    if (config.accounts.length === 0) {
      throw new Error('未配置邮箱账号。请在首页左侧「＋」添加邮箱')
    }

    const extractor = config.ai?.apiKey
      ? new AIExtractor({ apiKey: config.ai.apiKey, baseUrl: config.ai.baseUrl, model: config.ai.model })
      : null

    const providers = createProviders(config)
    const results: FetchedAccount[] = []

    for (const p of providers) {
      try {
        await p.connect()
        const maxUid = await p.getMaxUid()
        const sinceUid = Math.max(0, maxUid - 10)
        const mails = await p.fetchSince(sinceUid)
        await p.disconnect()

        const fetchedMails: FetchedMail[] = []
        for (const m of mails) {
          const item: FetchedMail = {
            uid: m.uid,
            messageId: m.messageId,
            from: m.from,
            subject: m.subject,
            date: m.date.toISOString(),
            text: m.text.slice(0, 500),
            attachments: m.attachments.map((a) => ({ filename: a.filename, size: a.size }))
          }
          if (extractor) {
            try {
              item.extracted = await extractor.extract({
                from: m.from,
                subject: m.subject,
                text: m.text
              })
            } catch (err) {
              console.error(`[AI] 提取失败 uid=${m.uid}:`, (err as Error).message)
            }
          }
          fetchedMails.push(item)
        }

        results.push({
          id: p.id,
          email: p.email,
          provider: p.provider,
          account: p.name,
          mails: fetchedMails
        })
      } catch (err) {
        await p.disconnect().catch(() => {})
        results.push({
          id: p.id,
          email: p.email,
          provider: p.provider,
          account: p.name,
          mails: [],
          error: (err as Error).message
        })
      }
    }

    return results
  })

  // ---------- 配置管理 ----------
  ipcMain.handle('config:get', () => loadConfig())

  ipcMain.handle('config:addAccount', (_e, account: AccountConfig) => {
    const config = loadConfig()
    if (config.accounts.some((a) => a.id === account.id)) {
      throw new Error(`账号 id "${account.id}" 已存在`)
    }
    config.accounts.push(account)
    saveConfig(config)
    return loadConfig()
  })

  ipcMain.handle('config:removeAccount', (_e, id: string) => {
    const config = loadConfig()
    config.accounts = config.accounts.filter((a) => a.id !== id)
    saveConfig(config)
    return loadConfig()
  })

  ipcMain.handle('config:updateAi', (_e, ai: AIConfig) => {
    const config = loadConfig()
    config.ai = ai
    saveConfig(config)
    return loadConfig()
  })

  ipcMain.handle('config:updatePoll', (_e, poll: PollConfig) => {
    const config = loadConfig()
    config.poll = poll
    saveConfig(config)
    return loadConfig()
  })

  ipcMain.handle('config:updateTelegram', (_e, telegram: TelegramConfig) => {
    const config = loadConfig()
    config.telegram = telegram
    saveConfig(config)
    return loadConfig()
  })
}
