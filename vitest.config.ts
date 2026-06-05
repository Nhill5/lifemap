import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 45_000,
    hookTimeout: 30_000,
    include: ['src/test/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
