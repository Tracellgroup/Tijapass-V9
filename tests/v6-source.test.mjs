import assert from 'node:assert/strict';
import fs from 'node:fs';
let ts;
try{ts=(await import('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')).default;}catch{try{ts=(await import('typescript')).default;}catch{ts=null;}}
if(!ts){console.log('SKIP additional source parse: TypeScript unavailable. Run npm run build on Netlify.');process.exit(0)}
const filenames=['src/App.jsx','src/AccountingStudio.jsx','src/accounting.js','src/accountingControls.js','src/v6i18n.js','src/domain.js','src/data.js','src/importers.js','src/main.jsx'];
for (const name of filenames){const source=fs.readFileSync(name,'utf8');const ast=ts.createSourceFile(name,source,ts.ScriptTarget.ES2022,true,name.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length,0,`${name}: ${ast.parseDiagnostics.map(x=>x.messageText).join(' | ')}`); console.log('PASS parse',name);}
// Validate asset imports without a dependency install.
for (const f of ['src/assets/tijapass-logo-light-transparent.png','src/assets/tijapass-logo-dark-transparent.png','src/styles.css','public/manifest.webmanifest'])assert.ok(fs.existsSync(f),`Missing ${f}`);
JSON.parse(fs.readFileSync('package.json','utf8'));JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
console.log('PASS V6 assets and manifests');
