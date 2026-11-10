import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tour-app/' // 본인의 GitHub 레포지토리 이름으로 지정
})