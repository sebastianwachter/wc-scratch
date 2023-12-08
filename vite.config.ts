import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      name: 'Scratch',
      entry: 'src/scratch/scratch.ts',
      formats: ['es', 'umd'],
      fileName: 'wc-scratch'
    },
    minify: 'esbuild',
    emptyOutDir: true
  }
})
