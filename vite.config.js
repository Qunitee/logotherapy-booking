import { defineConfig } from 'vite'

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
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                second: resolve(__dirname, 'bookings.html'),
            },
        },
    },
})