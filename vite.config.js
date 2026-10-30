import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Assessment / Exam JWT URLs contain dots:
 *
 * /assessment/header.payload.signature
 * /exam/header.payload.signature
 *
 * Vite's default SPA fallback can treat the dotted
 * last segment like a file and return 404.
 *
 * So we explicitly redirect these browser requests
 * to index.html.
 */

const assessmentSpaFallback = () => {
  const rewrite = (req, _res, next) => {
    const url = req.url || '';
    const accept = req.headers.accept || '';

    const isHtmlRequest =
      accept.includes('text/html');

    const isAssessmentRoute =
      url.startsWith('/assessment/');

    const isExamRoute =
      url.startsWith('/exam/');

    if (
      isHtmlRequest &&
      (isAssessmentRoute || isExamRoute)
    ) {
      req.url = '/index.html';
    }

    next();
  };

  return {
    name: 'assessment-spa-fallback',

    configureServer(server) {
      server.middlewares.use(rewrite);
    },

    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const nodeApiUrl =
    env.VITE_BACKEND_URL ||
    'http://100.117.158.50:3005';
  const aiApiUrl =
    env.VITE_AI_API_URL ||
    'http://100.117.158.50:8100';
  const resumeApiUrl =
    env.VITE_RESUME_API_URL ||
    'http://127.0.0.1:8000';

  return {
    plugins: [
      react(),
      assessmentSpaFallback(),
    ],

    server: {
      host: '0.0.0.0',

      port: 5173,

      hmr: {
        port: 3000,
      },

      proxy: {
        '/api/interviews': {
          target: nodeApiUrl,

          changeOrigin: true,

          secure: false,
        },

        '/api': {
          target: nodeApiUrl,

          changeOrigin: true,

          secure: false,

          rewrite: (path) =>
            path.replace(
              /^\/api/,
              '',
            ),
        },

        '/ai-backend': {
          target: aiApiUrl,

          changeOrigin: true,

          secure: false,

          rewrite: (path) =>
            path.replace(
              /^\/ai-backend/,
              '',
            ),
        },

        // Resume analysis and role discovery FastAPI service.
        '/resume-api': {
          target: resumeApiUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/resume-api/, ''),
        },
      },
    },

    preview: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});