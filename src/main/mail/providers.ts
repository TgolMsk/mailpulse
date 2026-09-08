import type { ProviderKind } from './types'

export interface ProviderSpec {
  host: string
  port: number
  name: string
  icon: string
  iconBg: string
}

/**
 * 各邮箱平台的 IMAP 连接规格。
 * 新增平台（163 / Outlook / 126 …）只需在这里加一项，无需改 provider 实现。
 */
export const PROVIDERS: Record<ProviderKind, ProviderSpec> = {
  qq: {
    host: 'imap.qq.com',
    port: 993,
    name: 'QQ 邮箱',
    icon: 'Q',
    iconBg: '#1E6FFF'
  },
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    name: 'Gmail',
    icon: 'G',
    iconBg: '#EA4335'
  }
}
