import 'dotenv/config';
import express from 'express';
import { runCheck } from './checker.js';
import { closeDb, initDb } from './db.js';
import { syncAllUsers } from './tracker.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Đọc thời gian giữa các lần check (Mặc định 1 giờ nếu không truyền CHECK_INTERVAL_MS)
const CHECK_INTERVAL_MS = parseInt(
  process.env.CHECK_INTERVAL_MS || String(60 * 60 * 1000),
  10
);

async function main() {
  console.log('=== Twenty Inactivity Worker (Self-Triggered Cron Mode) ===');

  // 1. Khởi tạo schema DB và sync toàn bộ user ban đầu
  await initDb();
  await syncAllUsers();

  // 2. Chạy check ngay lần đầu tiên khi ứng dụng vừa khởi động
  console.log('[Scheduler] Executing initial check on startup...');
  try {
    await runCheck();
  } catch (err) {
    console.error('[Scheduler] Initial check error:', err);
  }

  // 3. Thiết lập vòng lặp khép kín chạy định kỳ
  setInterval(async () => {
    console.log('[Scheduler] Starting scheduled inactivity check...');
    try {
      const result = await runCheck();
      console.log('[Scheduler] Scheduled check finished:', result);
    } catch (err) {
      console.error('[Scheduler] Scheduled check error:', err);
    }
  }, CHECK_INTERVAL_MS);

  // 4. Chỉ mở endpoint /healthz nội bộ để Docker container kiểm tra sống/chết (Health Check)
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'OK', mode: 'cron' });
  });

  const server = app.listen(PORT, () => {
    console.log(`[Worker] Internal status monitor running on port ${PORT}`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\nShutting down worker gracefully...');
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
