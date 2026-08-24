import fs from 'fs/promises';
import path from 'path';

export type LaiConfig = Record<string, unknown>;

const CONFIG_FILE = path.join(process.cwd(), 'lai-config.json');

export const DEFAULT_LAI_CONFIG: LaiConfig = {
  'timetable-lai': true,
  'predict-lai': false,
  'explore-lais': true
};

// `lai-config.json` was previously read with `fs.existsSync` + `fs.readFileSync`
// on every request to both /api/config and /api/chat. Synchronous file I/O blocks
// the Node event loop, so it stalls every other in-flight request - including
// active chat streams - for as long as the read takes.
//
// The file is writable at runtime by /api/admin/config, so it cannot be cached
// indefinitely. A short TTL removes the I/O from traffic bursts while keeping an
// administrator's flag change visible almost immediately.
const TTL_MS = 5_000;

let cached: LaiConfig | null = null;
let cachedAt = 0;
let inFlight: Promise<LaiConfig> | null = null;

async function readFromDisk(): Promise<LaiConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    // Guard against a truthy non-object (e.g. a bare JSON number) reaching callers
    // that index into it.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_LAI_CONFIG;
    }
    return parsed as LaiConfig;
  } catch {
    // A missing or malformed file falls back to the defaults, as before.
    return DEFAULT_LAI_CONFIG;
  }
}

export async function getLaiConfig(): Promise<LaiConfig> {
  if (cached && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }

  // Collapse concurrent misses into a single read rather than one per request.
  if (!inFlight) {
    inFlight = readFromDisk()
      .then((config) => {
        cached = config;
        cachedAt = Date.now();
        return config;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

/** Called after a write so the next read reflects it immediately. */
export function invalidateLaiConfig(): void {
  cached = null;
  cachedAt = 0;
}
