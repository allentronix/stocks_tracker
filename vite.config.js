import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serves /api/* in `npm run dev` by running the same Netlify Function that
 * handles it in production (netlify/functions/api.mjs).
 */
function netlifyApiDev() {
  return {
    name: 'netlify-api-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          const { default: handler } = await server.ssrLoadModule(
            '/netlify/functions/api.mjs'
          )
          const response = await handler(
            new Request(`http://localhost${req.originalUrl}`)
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make .env keys available to the API function during local dev.
  const fileEnv = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(fileEnv)) {
    process.env[key] ??= value
  }

  return {
    plugins: [react(), tailwindcss(), netlifyApiDev()],
  }
})
