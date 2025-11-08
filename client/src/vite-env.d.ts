/// <reference types="vite/client" />

interface ImportMeta {
  env: {
    VITE_SERVER_URL: string
    VITE_HTTPS_ENABLE: boolean
    VITE_HTTPS_KEY_PATH: string
    VITE_HTTPS_CERT_PATH: string
    VITE_DEV_HOST: string
    VITE_DEV_PORT: number
  }
}

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string
        sendMessage?: (
          extensionId: string,
          message: { type: string; [key: string]: unknown }
        ) => Promise<void>
      }
    }
  }
}
