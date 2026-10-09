import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'municipal-events-development-api',
    configureServer(server) {
      server.middlewares.use('/api/public-events', async (request, response) => {
        if (request.method !== 'GET') { response.statusCode = 405; response.end(); return }
        const handler = await server.ssrLoadModule('/api/public-events.ts') as { GET: () => Promise<Response> }
        const result = await handler.GET()
        response.statusCode = result.status
        result.headers.forEach((value, key) => response.setHeader(key, value))
        response.end(await result.text())
      })
    },
  }],
  base: './',
})
