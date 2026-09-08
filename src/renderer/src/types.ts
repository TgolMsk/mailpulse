export type CategoryKind = 'fin' | 'sched' | 'notice'
export type UrgencyKind = 'urg' | 'mid' | 'low'
export type ProviderKind = 'qq' | 'gmail'

export interface MailItem {
  id: string
  accountId: string
  from: string
  via: string
  when: string
  date: string
  subject: string
  summary: string
  text: string
  html?: string
  category: { label: string; kind: CategoryKind }
  urgency: { label: string; kind: UrgencyKind }
  extras: string[]
  avatar: { emoji: string; bg: string }
}

export interface Account {
  id: string
  name: string
  addr: string
  icon: string
  iconBg: string
  unread: number
}

export interface AccountConfig {
  id: string
  provider: ProviderKind
  email: string
  authCode: string
}

export interface AIConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface PollConfig {
  enabled: boolean
  intervalSeconds: number
  lookbackHours: number
}

export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface AppConfig {
  accounts: AccountConfig[]
  ai?: AIConfig
  poll?: PollConfig
  telegram?: TelegramConfig
}

export interface StoredMail {
  accountId: string
  email: string
  name: string
  uid: number
  messageId: string
  from: string
  subject: string
  date: string
  text: string
  html?: string
  extracted?: {
    summary: string
    category: string
    urgency: 'high' | 'medium' | 'low'
    todos: string[]
    entities: { amount?: string; dates?: string[]; people?: string[] }
  }
  processedAt: string
}
