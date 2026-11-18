type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
let installPrompt: InstallPrompt | undefined
let prompting = false

export function registerPwa() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    installPrompt = event as InstallPrompt
  })
  window.addEventListener('appinstalled', () => { installPrompt = undefined })
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return
  // Registration failure must not reject app initialization or erase the current screen.
  void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(error => {
    console.error('TunaEye offline cache could not be registered:', error)
    window.dispatchEvent(new CustomEvent('tunaeye-offline-error', { detail: String(error) }))
  })
}

export async function requestPwaInstall(): Promise<string> {
  if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches) return 'TunaEye is already running as an installed app.'
  if (prompting) return 'The installation prompt is already open.'
  if (!installPrompt) return window.isSecureContext
    ? 'Use your browser menu to install TunaEye. Offline installation requires the production kiosk build.'
    : 'Open TunaEye through HTTPS or localhost to install it and enable offline caching.'
  const prompt = installPrompt
  prompting = true
  try {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    installPrompt = undefined
    return outcome === 'accepted' ? 'TunaEye installation requested.' : 'Installation cancelled.'
  } finally { prompting = false }
}
