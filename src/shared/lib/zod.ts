// Single import point for zod. By default zod 4 probes `new Function()` to compile faster
// validators, which our Content-Security-Policy (no eval) blocks and reports. Jitless mode
// never attempts eval. Always import `z` from here, not from 'zod' directly.
import { z } from 'zod';

z.config({ jitless: true });

export { z };
