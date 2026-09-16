import { pool, upsertActivity } from './db.js';

export async function pollActiveUsers() {
  const result = await pool.query(`
    SELECT
      u.id AS user_id,
      uw."workspaceId" AS workspace_id,
      u.email,
      CONCAT(u."firstName", ' ', u."lastName") AS name,
      u."updatedAt" AS last_active
    FROM core.user u
    JOIN core."userWorkspace" uw ON uw."userId" = u.id
    JOIN core.workspace w ON w.id = uw."workspaceId"
    WHERE u."deletedAt" IS NULL
      AND w."deletedAt" IS NULL
      AND w."activationStatus" = 'ACTIVE'
      AND u."updatedAt" > NOW() - INTERVAL '1 hour'
  `);

  if (result.rows.length === 0) return;

  for (const row of result.rows) {
    await upsertActivity(
      row.user_id,
      row.workspace_id,
      row.email,
      row.name || row.email,
    );
  }

  console.log(`[Tracker] Synced ${result.rows.length} active user(s) from DB`);
}

export async function syncAllUsers() {
  const result = await pool.query(`
    SELECT
      u.id AS user_id,
      uw."workspaceId" AS workspace_id,
      u.email,
      CONCAT(u."firstName", ' ', u."lastName") AS name,
      u."updatedAt" AS last_active
    FROM core.user u
    JOIN core."userWorkspace" uw ON uw."userId" = u.id
    JOIN core.workspace w ON w.id = uw."workspaceId"
    WHERE u."deletedAt" IS NULL
      AND w."deletedAt" IS NULL
      AND w."activationStatus" = 'ACTIVE'
  `);

  for (const row of result.rows) {
    await upsertActivity(
      row.user_id,
      row.workspace_id,
      row.email,
      row.name || row.email,
    );
  }

  console.log(`[Tracker] Synced ${result.rows.length} user(s) from core DB`);
}
