import { getInactiveUsers, markReminderSent } from './db.js';
import { sendReminderEmail } from './mailer.js';
import { pollActiveUsers } from './tracker.js';

/**
 * Chuyển đổi chuỗi thời gian (ví dụ: '30d', '12h', '15m') sang miligiây (ms)
 */
function parseDuration(input: string): number {
  const match = input.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 30 * 86400_000; // Mặc định 30 ngày nếu sai định dạng

  const val = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60_000;
    case 'h': return val * 3600_000;
    case 'd': return val * 86400_000;
    default: return 30 * 86400_000;
  }
}

/**
 * Tiến trình chính kiểm tra và gửi email cho người dùng không hoạt động
 */
export async function runCheck() {
  // 1. Cập nhật danh sách người dùng có hoạt động mới nhất từ DB Twenty
  await pollActiveUsers();

  // 2. Lấy ngưỡng thời gian inactive từ biến môi trường
  const rawThreshold = process.env.INACTIVITY_THRESHOLD || '30d';
  const thresholdMs = parseDuration(rawThreshold);

  // 3. Truy vấn danh sách user quá hạn chưa hoạt động
  const inactiveUsers = await getInactiveUsers(thresholdMs);

  if (inactiveUsers.length === 0) {
    console.log('[Check] No inactive users found');
    return { count: 0, sent: [] };
  }

  console.log(`[Check] Found ${inactiveUsers.length} inactive user(s)`);

  const sentEmails: string[] = [];

  // 4. Duyệt qua từng user và gửi email nhắc nhở
  for (const user of inactiveUsers) {
    const sent = await sendReminderEmail(
      user.email,
      user.name,
      user.inactiveDays,
    );

    if (sent) {
      // 5. Đánh dấu đã gửi email để tránh gửi lặp lại
      await markReminderSent(user.userId, user.workspaceId);
      sentEmails.push(user.email);
      console.log(`[Check] Reminder sent to ${user.email} (inactive ${user.inactiveDays}d)`);
    }
  }

  return { count: inactiveUsers.length, sent: sentEmails };
}
