// Writes vercel.json from src/shared/config/security.ts (run: npm run hosting:sync).
// A unit test fails if the committed file drifts from the policy.
import { writeFileSync } from 'node:fs';
import { vercelConfig } from '../src/shared/config/hosting.ts';

writeFileSync(new URL('../vercel.json', import.meta.url), `${JSON.stringify(vercelConfig(), null, 2)}\n`);
console.log('wrote vercel.json');
