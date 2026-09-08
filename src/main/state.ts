import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { ExtractedMail } from './ai/extractor'

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
  extracted?: ExtractedMail
  processedAt: string
}

export interface AppState {
  /** accountId -> 已处理到的最大 UID（增量拉取基线） */
  lastUid: Record<string, number>
  /** 已保存到本地的完整邮件（含正文 + AI 提取结果），最近 500 条 */
  mails: StoredMail[]
}

function statePath(): string {
  return join(app.getPath('userData'), 'state.json')
}

export function loadState(): AppState {
  try {
    const raw = readFileSync(statePath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { lastUid: parsed.lastUid ?? {}, mails: parsed.mails ?? [] }
  } catch {
    return { lastUid: {}, mails: [] }
  }
}

export function saveState(state: AppState): void {
  writeFileSync(statePath(), JSON.stringify(state, null, 2))
}

/** 返回 undefined 表示该账号从未处理过（首次运行需建立基线） */
export function getLastUid(state: AppState, accountId: string): number | undefined {
  return state.lastUid[accountId]
}

export function setLastUid(state: AppState, accountId: string, uid: number): void {
  state.lastUid[accountId] = uid
}

/** 追加邮件（按 accountId+uid 去重），保留最近 500 条 */
export function addMails(state: AppState, mails: StoredMail[]): void {
  const seen = new Set(state.mails.map((m) => `${m.accountId}:${m.uid}`))
  const fresh = mails.filter((m) => !seen.has(`${m.accountId}:${m.uid}`))
  state.mails = [...fresh, ...state.mails].slice(0, 500)
}
