import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { app } from 'electron'
import type { ProviderKind } from './mail/types'

export interface AccountConfig {
  id: string
  provider: ProviderKind
  email: string
  authCode: string
}

/** OpenAI 兼容接口配置（openai SDK，换 baseUrl 即接任意兼容服务） */
export interface AIConfig {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface PollConfig {
  enabled: boolean
  intervalSeconds: number
  /** 首次运行（账号从未处理过）回溯拉取的时长（小时） */
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

function userConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

/**
 * 加载配置，优先级：
 * 1. 环境变量 QQ_EMAIL + QQ_AUTH_CODE（单账号快速测试）
 * 2. userData/config.json（UI 里修改后的权威配置）
 * 3. 项目根 config.json（初始默认，首次运行迁移）
 */
export function loadConfig(): AppConfig {
  const envEmail = process.env.QQ_EMAIL
  const envCode = process.env.QQ_AUTH_CODE
  if (envEmail && envCode) {
    return {
      accounts: [{ id: 'qq', provider: 'qq', email: envEmail, authCode: envCode }]
    }
  }

  const candidates = [userConfigPath(), join(app.getAppPath(), 'config.json')]
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf-8')
      return JSON.parse(raw) as AppConfig
    } catch {
      // 继续尝试下一个路径
    }
  }

  return { accounts: [] }
}

/** 保存配置到 userData/config.json（UI 修改的权威位置） */
export function saveConfig(config: AppConfig): void {
  const p = userConfigPath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(config, null, 2))
}
