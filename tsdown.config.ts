import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/clients.ts',
        'src/modules.ts',
    ],
    format: ['cjs', 'esm'],             // Generate both CommonJS and ES modules for compatibility
    target: 'es2022',                   // Target modern JavaScript (Node 18+ support)
    outDir: 'dist',                     // Output directory for built files
    clean: true,                        // Remove previous build artifacts before building
    dts: true,                          // Generate TypeScript declaration files (.d.ts)
    sourcemap: true,                    // Generate sourcemaps for better debugging in production
    minify: true,                       // Minify output for smaller bundle size
    outputOptions: {
        keepNames: true,                // Preserve function/class names for stack traces
    },
    outExtensions({ format }) {
        return {
            js: format === 'cjs' ? '.cjs' : '.mjs'
        }
    },
})