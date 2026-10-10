/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BN_BASE_URL: string;
  readonly BN_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
