/// <reference types="vite/client" />

interface ImportMeta {
  env: {
    VITE_SERVER_URL: string
    VITE_HTTPS_ENABLE: boolean
    VITE_HTTPS_KEY_PATH:string
    VITE_HTTPS_CERT_PATH: string
    VITE_DEV_HOST: string
    VITE_DEV_PORT: number
  }
}
