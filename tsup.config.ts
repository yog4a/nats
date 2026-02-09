import { defineConfig } from 'tsup';

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/clients.ts',
        'src/modules.ts',
    ],
    format: ['cjs', 'esm'],
    target: 'es2022',
    outDir: 'dist',
    clean: true,
    dts: true,
    sourcemap: false,
    splitting: false,
    keepNames: true,
    outExtension({ format }) {
        return {
            js: format === 'cjs' ? '.cjs' : '.mjs'
        }
    },
});
