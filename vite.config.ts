import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'node:child_process'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'station-sqlite-development',
    configureServer(server) {
      server.middlewares.use('/local-api', (req, res) => {
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) { res.statusCode = 403; res.end(); return }
        let body = '', size = 0
        req.on('data', chunk => { size += chunk.length; if (size > 16 * 1024 * 1024) { req.destroy(); return }; body += chunk })
        req.on('end', () => {
          let input
          try { input = { method: req.method, path: `/local-api${req.url?.split('?')[0]}`, body: body ? JSON.parse(body) : undefined } }
          catch { res.statusCode = 400; res.end(); return }
          const child = spawn(process.env.PYTHON || 'python', ['server/station.py', '--request'], { windowsHide: true })
          let output = ''
          child.stdout.on('data', chunk => { output += chunk })
          child.on('error', () => { res.statusCode = 503; res.end('SQLite service unavailable') })
          child.on('close', code => { if (res.writableEnded) return; res.statusCode = code === 0 ? 200 : 503; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(code === 0 ? output : '{"error":"SQLite save failed"}') })
          child.stdin.end(JSON.stringify(input))
        })
      })
    },
  }],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
