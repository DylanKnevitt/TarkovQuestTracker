import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: './index.html'
            },
            output: {
                manualChunks: {
                    'ocr': ['tesseract.js'],
                    'search': ['fuse.js']
                }
            }
        }
    },
    server: {
        port: 8080,
        open: true
    }
});
