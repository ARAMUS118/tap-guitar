import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Relative paths work on GitHub Pages repository subpaths as well as localhost.
export default defineConfig({plugins:[react()], base:'./'})
