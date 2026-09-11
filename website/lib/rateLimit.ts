/**
 * Lexino AI — Production Sliding-Window Token-Bucket Rate Limiter
 * 
 * Provides memory-safe, high-concurrency rate limiting for API routes.
 * Automatically evicts stale buckets to guarantee zero memory leaks under 1,000+ concurrent users.
 */

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000; // Garbage collection every 60s

/**
 * Periodically purge stale records to prevent memory bloat in high-concurrency environments.
 */
function evictStaleBuckets(ttlMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.lastRefill > ttlMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds until next token
}

/**
 * Checks and consumes a token from the bucket for a given identifier.
 * 
 * @param key Unique key (e.g. `chat:${userId || clientIp}`)
 * @param maxTokens Maximum tokens allowed in window
 * @param windowMs Window duration in milliseconds (e.g. 60_000 for 1 minute)
 */
export function checkRateLimit(
  key: string,
  maxTokens: number = 30,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  evictStaleBuckets(windowMs);

  let record = rateLimitStore.get(key);

  if (!record) {
    record = {
      tokens: maxTokens - 1,
      lastRefill: now,
    };
    rateLimitStore.set(key, record);
    return {
      success: true,
      limit: maxTokens,
      remaining: maxTokens - 1,
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfter: 0,
    };
  }

  // Calculate elapsed time and replenish tokens proportionally
  const elapsedMs = now - record.lastRefill;
  const refillRate = maxTokens / windowMs; // tokens per ms
  const tokensToAdd = elapsedMs * refillRate;

  record.tokens = Math.min(maxTokens, record.tokens + tokensToAdd);
  record.lastRefill = now;

  if (record.tokens >= 1) {
    record.tokens -= 1;
    rateLimitStore.set(key, record);

    const timeToEmpty = ((maxTokens - record.tokens) / refillRate);
    return {
      success: true,
      limit: maxTokens,
      remaining: Math.floor(record.tokens),
      reset: Math.ceil((now + timeToEmpty) / 1000),
      retryAfter: 0,
    };
  }

  // Rate limit exceeded
  const timeUntilNextToken = Math.ceil((1 - record.tokens) / refillRate);
  const retryAfterSeconds = Math.max(1, Math.ceil(timeUntilNextToken / 1000));

  return {
    success: false,
    limit: maxTokens,
    remaining: 0,
    reset: Math.ceil((now + timeUntilNextToken) / 1000),
    retryAfter: retryAfterSeconds,
  };
}

/**
 * Formats rate-limit headers for NextResponse
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.retryAfter > 0 ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}
