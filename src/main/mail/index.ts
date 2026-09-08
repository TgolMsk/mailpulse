import type { AppConfig } from '../config'
import { ImapMailProvider } from './imap'
import type { MailProvider } from './types'

/** 根据配置创建邮箱接入实例（支持多平台、同平台多账户） */
export function createProviders(config: AppConfig): MailProvider[] {
  return config.accounts.map((acc) => new ImapMailProvider(acc))
}
