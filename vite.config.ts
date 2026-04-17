import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    port: 8080,
  },
  build: {
    modulePreload: {
      // Only preload chunks needed for the login page.
      // vendor-radix, vendor-recharts, vendor-dates are lazy — don't compete
      // for bandwidth on slow mobile connections.
      resolveDependencies: (_filename: string, deps: string[]) => {
        return deps.filter(dep =>
          !dep.includes('vendor-radix') &&
          !dep.includes('vendor-recharts') &&
          !dep.includes('vendor-dates')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          // react-slot and react-label are excluded — they're tiny and used by
          // Login (Button/Label), so they stay in the index chunk to avoid
          // preloading the entire vendor-radix bundle on the login page.
          'vendor-radix': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar', '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover', '@radix-ui/react-progress',
            '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area',
            '@radix-ui/react-select', '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch', '@radix-ui/react-tabs',
            '@radix-ui/react-toast', '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip',
          ],
          'vendor-recharts': ['recharts'],
          'vendor-dates': ['luxon', 'date-fns'],
        },
      },
    },
  },
}));
