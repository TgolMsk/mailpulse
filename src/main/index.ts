import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { loadConfig } from './config'
import { startPoller } from './poller'
import { startCallbackLoop } from './notify/callback'
import { TelegramNotifier } from './notify/telegram'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F5F4E2',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  const config = loadConfig()

  // 自动拉取引擎
  if (config.poll?.enabled) {
    startPoller(config.poll.intervalSeconds ?? 300, {
      onNewMail: (items) => {
        console.log(`[poller] 发现 ${items.length} 封新邮件`)
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('mail:new', items)
        }
      },
      onError: (msg) => console.error('[poller]', msg)
    })
  }

  // Telegram「查看原邮件」callback 处理
  if (config.telegram?.botToken) {
    const notifier = new TelegramNotifier({
      botToken: config.telegram.botToken,
      chatId: config.telegram.chatId
    })
    startCallbackLoop(notifier)
    console.log('[telegram] callback 监听已启动')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
