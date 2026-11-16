import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
await mkdir('public/source',{recursive:true});
execFileSync('tar',['-czf','public/source/pocket-favorites-source.tgz','--exclude=*.tsbuildinfo','src','scripts','tests','public/data','public/licenses','package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','playwright.config.ts','README.md','LICENSE','.gitignore','.nvmrc','.github']);
console.log('Archive source correspondante préparée.');
