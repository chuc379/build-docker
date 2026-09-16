import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const SCHEMA = 'inactivity_wf';

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.user_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL DEFAULT '',
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reminder_sent_at TIMESTAMPTZ,
        reminder_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, workspace_id)
      )
    `);

    console.log('[DB] Schema + table ready');
  } finally {
    client.release();
  }
}

export async function upsertActivity(
  userId: string,
  workspaceId: string,
  email: string,
  name: string,
) {
  await pool.query(
    `
    INSERT INTO ${SCHEMA}.user_activity (user_id, workspace_id, user_email, user_name, last_activity_at, reminder_sent_at)
    VALUES ($1, $2, $3, $4, NOW(), NULL)
    ON CONFLICT (user_id, workspace_id)
    DO UPDATE SET
      last_activity_at = NOW(),
      user_email = EXCLUDED.user_email,
      user_name = EXCLUDED.user_name,
      reminder_sent_at = NULL,
      updated_at = NOW()
    `,
    [userId, workspaceId, email, name],
  );
}

export async function getInactiveUsers(
  thresholdMs: number,
): Promise<{ userId: string; workspaceId: string; email: string; name: string; inactiveDays: number }[]> {
  const result = await pool.query(
    `
    SELECT
      user_id, workspace_id, user_email, user_name,
      EXTRACT(EPOCH FROM (NOW() - last_activity_at)) / 86400 AS inactive_days
    FROM ${SCHEMA}.user_activity
    WHERE last_activity_at < NOW() - ($1 || ' milliseconds')::INTERVAL
      AND (reminder_sent_at IS NULL OR reminder_sent_at < NOW() - ($1 || ' milliseconds')::INTERVAL)
    ORDER BY last_activity_at ASC
    `,
    [thresholdMs],
  );

  return result.rows.map((r) => ({
    userId: r.user_id,
    workspaceId: r.workspace_id,
    email: r.user_email,
    name: r.user_name,
    inactiveDays: Math.floor(Number(r.inactive_days)),
  }));
}

export async function markReminderSent(userId: string, workspaceId: string) {
  await pool.query(
    `
    UPDATE ${SCHEMA}.user_activity
    SET reminder_sent_at = NOW(), reminder_count = reminder_count + 1, updated_at = NOW()
    WHERE user_id = $1 AND workspace_id = $2
    `,
    [userId, workspaceId],
  );
}

export async function closeDb() {
  await pool.end();
}
