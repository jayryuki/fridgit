import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const certDir = path.resolve(__dirname, '..', 'certs')
const keyPath = path.join(certDir, 'server.key')
const certPath = path.join(certDir, 'server.crt')

const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    ...(hasCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    }),
    proxy: {
      '/api': {
        target: hasCerts ? 'https://localhost:3000' : 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
