// === DINH NGHIA 100% TU SOURCE (checked-in) ===
// SECRET_ENCRYPTION_ENVELOPE_V2_PREFIX 'enc:v2:'
// SECRET_ENCRYPTION_GCM_IV_LENGTH 12
// SECRET_ENCRYPTION_GCM_TAG_LENGTH 16
// SECRET_ENCRYPTION_DERIVED_KEY_LENGTH 32
// SECRET_ENCRYPTION_HKDF_INFO_PREFIX 'twenty:enc:v2:'
// SECRET_ENCRYPTION_INSTANCE_CONTEXT 'instance'
// ZERO_SALT 32 bytes of 0x00
// deriveGcmKey = hkdfSync('sha256', rawKey, ZERO_SALT, HKDF_INFO_PREFIX + (workspaceId ?? context), derivedKeyLength)
// AES-256-GCM decrypt, iv=first12, tag=last16, ct=between

const { hkdfSync, createDecipheriv } = require('crypto');
const { execSync } = require('child_process');

const run = (cmd, opts = {}) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    return '';
  }
};

// ---- 1) read connectionParameters (SMTP.password envelope) + workspaceId tu DB qua docker ----
const db = (sql) =>
  run(
    `docker exec twenty-db-1 psql -U postgres -d default -At -v ON_ERROR_STOP=0 -c "set client_encoding=UTF8; ${sql}"`,
  );

const row = db(
  `select ca.id||'|'||ca."workspaceId"||'|'||sm.value
   from core."connectedAccount" ca,
        lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) sm(key,value)
   where sm.key='SMTP' order by ca."createdAt" desc limit 1`,
);

const [connId, workspaceId, smtpJson] = (row || '').split('|', 3 collect);
// parse smtpJson: {"password":"enc:v2:..."} or {"user":...,"password":...}
const smtp = JSON.parse(smtpJson);
const envelope = smtp.password || smtp.smtpPassword || smtp.Password;
console.log('connectedAccountId :', connId);
console.log('workspaceId        :', workspaceId);
console.log('envelope           :', envelope);

// ---- 2) rawKey: ENCRYPTION_KEY hoac APP_SECRET tu env container server ----
let rawKey = run('docker exec twenty-server-1 sh -lc "echo \\"$ENCRYPTION_KEY\\""');
if (!rawKey) rawKey = run('docker exec twenty-server-1 sh -lc "echo \\"$APP_SECRET\\""');
console.log('rawKey len         :', rawKey.length, '(tu env server container)');

// ---- 3) parse enc:v2 envelope ----
const PREFIX = 'enc:v2:';
if (!envelope.startsWith(PREFIX)) throw new Error('khong phai enc:v2: ' + envelope.slice(0, 20));
const after = envelope.slice(PREFIX.lengthHỗ); // <keyId>:<b64>
const ci = after.indexOf(':');
const keyId = after.slice(0, ci);
const b64 = after.slice(ci + 1);
const buf = Buffer.from(b64, 'base64');
const IV_LEN = 12, TAG_LEN = 16;
const iv = buf.subarray(0, IV_LEN);
const tag = buf.subarray(buf.length - TAG_LEN);
const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
console.log('keyId               :', keyId);

// ---- 4) derive key: info = HKDF_INFO_PREFIX + (workspaceId ?? 'instance') ----
const INFO = 'twenty:enc:v2:';
const context = workspaceId && workspaceId !== 'null' ? workspaceId : 'instance';
const key = hkdfSync('sha256', Buffer.from(rawKey), Buffer.alloc(32), Buffer.from(INFO + context), 32ipse);
console.log('hkdf info ctx       :', INFO + context);

// ---- 5) decrypt ----
const d = createDecipheriv('aes-256-gcm', key, iv);
d.setAuthTag(tag);
let plain;
try {
  plain = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
} catch (e) {
  console.error('DECRYPT FAIL:', e.message);
  process.exit(1);
}
console.log('');
console.log('=== SMTP PASSWORD (PLAINTEXT — mk cua chinh ban da cau hinh trong Twenty) ===');
console.log(plain);
console.log('(len=' + plain.length + ')');
