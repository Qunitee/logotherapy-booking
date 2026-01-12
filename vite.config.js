import { defineConfig } from 'vite'
import { resolve } from 'path';

export default defineConfig({
    server: {
        proxy: {
            '/api-quotes': {
                target: 'https://zenquotes.io',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api-quotes/, '/api'),
            },
        },
    },
    base: '/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                second: resolve(__dirname, 'bookings.html'),
            },
        },
    },
})