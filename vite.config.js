
import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        proxy: {
            '/api_quotes': {
                target: 'https://api.quotable.io',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api_quotes/, ''),
            },
        },
    },
})