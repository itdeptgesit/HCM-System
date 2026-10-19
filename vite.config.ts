import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      strictPort: false,
      host: '0.0.0.0',
      fs: {
        allow: ['.', '..']
      },
      watch: {
        ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**'],
      },
    },
    plugins: [react()],
    define: {
      'process.env.VITE_CLOUDINARY_UPLOAD_PRESET': JSON.stringify(env.VITE_CLOUDINARY_UPLOAD_PRESET),
      'process.env.VITE_CLOUDINARY_CLOUD_NAME': JSON.stringify(env.VITE_CLOUDINARY_CLOUD_NAME),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@workspace/ui/components': path.resolve(__dirname, 'components/ui'),
        '@workspace/ui/lib': path.resolve(__dirname, 'lib'),
        '@workspace/ui': path.resolve(__dirname, 'components/ui'),
        '@tanstack/react-router': path.resolve(__dirname, 'lib/router-shim'),
        'motion/react': path.resolve(__dirname, 'node_modules/framer-motion'),
      }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@iconify/react', 'framer-motion'],
            supabase: ['@supabase/supabase-js']
          }
        }
      }
    }
  };
});
