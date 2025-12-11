import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        explore: resolve(__dirname, 'explore.html'),
        garden: resolve(__dirname, 'garden.html')
      }
    }
  },
  publicDir: 'public',
  root: './'
});








