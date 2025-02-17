import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
    plugins: [eslint({
        cache: false // 禁用缓存
    })],
});