/// <reference types="vite/client" />

interface ImportMeta {
  env: {
    VITE_SERVER_URL: string
    VITE_HTTPS_ENABLE: boolean
    VITE_HTTPS_KEY_PATH: string
    VITE_HTTPS_CERT_PATH: string
    VITE_DEV_HOST: string
    VITE_DEV_PORT: number
    VITE_FIREBASE_API_KEY: string
    VITE_FIREBASE_AUTH_DOMAIN: string
    VITE_FIREBASE_PROJECT_ID: string
    VITE_FIREBASE_STORAGE_BUCKET: string
    VITE_FIREBASE_MESSAGING_SENDER_ID: string
    VITE_FIREBASE_APP_ID: string
    VITE_FIREBASE_MEASURMENT_ID: string
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
