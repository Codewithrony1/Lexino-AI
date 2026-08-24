-- Adds the indexes introduced in prisma/schema.prisma.
--
-- WHY: PostgreSQL does not create indexes for foreign keys automatically. The
-- Message table had no indexes whatsoever, so `findMany({ where: { sessionId },
-- orderBy: { createdAt: 'asc' } })` - the query that loads a conversation - had to
-- sequentially scan every message row in the database and then sort the matches in
-- memory. Cost grew linearly with total message volume across all users.
--
-- HOW TO APPLY: run this against the database *before* deploying, or right after.
-- It is additive and safe to run on a live database:
--
--   psql "$DATABASE_URL" -f prisma/manual/add-missing-indexes.sql
--
-- CONCURRENTLY builds each index without taking a write lock, so reads and writes
-- continue normally while it runs. It cannot run inside a transaction block, which
-- is why this is a plain script rather than a Prisma migration.
--
-- The index names match Prisma's own naming convention exactly, so a later
-- `prisma db push` / `prisma migrate` will recognise them as already present and
-- will not attempt to recreate them.

-- Loading one conversation, ordered. Covers the ORDER BY, so no sort step is needed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_sessionId_createdAt_idx"
  ON "Message" ("sessionId", "createdAt");

-- message.count({ where: { userId } }) and the ON DELETE CASCADE lookup.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_userId_idx"
  ON "Message" ("userId");

-- Required by ON DELETE SET NULL when a user is removed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ApiLog_userId_idx"
  ON "ApiLog" ("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CleanupLog_userId_idx"
  ON "CleanupLog" ("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Payment_userId_createdAt_idx"
  ON "Payment" ("userId", "createdAt");
