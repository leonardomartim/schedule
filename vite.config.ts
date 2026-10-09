import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'public-events-development-api',
    configureServer(server) {
      server.middlewares.use('/api/public-events', async (request, response) => {
        if (request.method !== 'GET') { response.statusCode = 405; response.end(); return }
        const handler = await server.ssrLoadModule('/api/public-events.ts') as { GET: (request: Request) => Promise<Response> }
        const result = await handler.GET(new Request(`http://localhost/api/public-events${request.url ?? ''}`))
        response.statusCode = result.status
        result.headers.forEach((value, key) => response.setHeader(key, value))
        response.end(await result.text())
      })
    },
  }],
  base: './',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'supabase-client', test: /node_modules[\\/]@supabase[\\/]/ }] },
      },
    },
  },
})
