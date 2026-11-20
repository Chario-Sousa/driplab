const { copyFileSync } = require('node:fs');
const { join } = require('node:path');

const raiz = join(__dirname, '..');
copyFileSync(
  join(raiz, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'),
  join(raiz, 'public', 'supabase.js')
);
