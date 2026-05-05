import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/AppPortal/%E7%B5%84%E7%B9%94%E5%9B%B3%E3%82%A2%E3%83%97%E3%83%AA/',
})
