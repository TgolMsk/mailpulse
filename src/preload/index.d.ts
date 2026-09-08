interface StoredMail {
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

declare global {
  interface Window {
    api: {
      fetchMails: () => Promise<
        Array<{
          id: string
          email: string
          provider: 'qq' | 'gmail'
          account: string
          mails: Array<{
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
          }>
          error?: string
        }>
      >
      fetchHistory: () => Promise<StoredMail[]>
      sync: () => Promise<StoredMail[]>
      fetchAccounts: () => Promise<
        Array<{
          id: string
          email: string
          provider: 'qq' | 'gmail'
          name: string
          icon: string
          iconBg: string
        }>
      >
      onNewMail: (cb: (items: StoredMail[]) => void) => () => void
      getConfig: () => Promise<{
        accounts: Array<{ id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }>
        ai?: { provider: string; apiKey: string; baseUrl: string; model: string }
        poll?: { enabled: boolean; intervalSeconds: number; lookbackHours: number }
        telegram?: { botToken: string; chatId: string }
      }>
      addAccount: (account: { id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }) => Promise<{
        accounts: Array<{ id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }>
        ai?: { provider: string; apiKey: string; baseUrl: string; model: string }
        poll?: { enabled: boolean; intervalSeconds: number; lookbackHours: number }
        telegram?: { botToken: string; chatId: string }
      }>
      removeAccount: (id: string) => Promise<{
        accounts: Array<{ id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }>
        ai?: { provider: string; apiKey: string; baseUrl: string; model: string }
        poll?: { enabled: boolean; intervalSeconds: number; lookbackHours: number }
        telegram?: { botToken: string; chatId: string }
      }>
      updateAi: (ai: { provider: string; apiKey: string; baseUrl: string; model: string }) => Promise<{
        accounts: Array<{ id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }>
        ai?: { provider: string; apiKey: string; baseUrl: string; model: string }
        poll?: { enabled: boolean; intervalSeconds: number; lookbackHours: number }
        telegram?: { botToken: string; chatId: string }
      }>
      updatePoll: (poll: { enabled: boolean; intervalSeconds: number; lookbackHours: number }) => Promise<{
        accounts: Array<{ id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }>
        ai?: { provider: string; apiKey: string; baseUrl: string; model: string }
        poll?: { enabled: boolean; intervalSeconds: number; lookbackHours: number }
        telegram?: { botToken: string; chatId: string }
      }>
      updateTelegram: (telegram: { botToken: string; chatId: string }) => Promise<{
        accounts: Array<{ id: string; provider: 'qq' | 'gmail'; email: string; authCode: string }>
        ai?: { provider: string; apiKey: string; baseUrl: string; model: string }
        poll?: { enabled: boolean; intervalSeconds: number; lookbackHours: number }
        telegram?: { botToken: string; chatId: string }
      }>
    }
  }
}

export {}
