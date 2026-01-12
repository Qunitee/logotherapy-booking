import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                bookings: resolve(__dirname, 'bookings.html'),
            },
        },
    },
    server: {
        proxy: {
            '/api-quotes': {
                target: 'https://zenquotes.io',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api-quotes/, '/api'),
            },
        },
    },
})