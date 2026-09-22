const { hkdfSync, createDecipheriv } = require('crypto');
const { execSync } = require('child_process');

function q(sql) {
  return execSync(
    `docker exec twenty-db-1 psql -U postgres -d default -Atc "set client_encoding='UTF8'; ${sql}"`,
    { encoding: 'utf8' }
  ).trim();
}

// 1) thong tin SMART account la cua workspace nao + envelope password (RAW, de soi)
const info = q(
  `select ca.id||'|'||ca.workspaceId||'|'||rec.value
   from core."connectedAccount" ca,
        lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as top(k,v),
        lateral jsonb_each_text(coalesce(top.v::jsonb,'{}'::jsonb)) as rec(k,v)
   where top.k='SMTP' and rec.k='password`
);
const [caId, workspaceId, envelope] = info.split('|');
console.log('CONNECTED_ACCOUNT_ID =', caId);
console.log('WORKSPACE_ID        =', workspaceId);
console.log('ENVELOPE (v2)       =', envelope);

// 2) rawKey = ENCRYPTION_KEY (hoac APP_SECRET) tu moi truong server container
let rawKey = '';
try {
  rawKey = execSync('docker exec twenty-server-1 printenv ENCRYPTION_KEY', {
    encoding: 'utf8',
  }).trim();
} catch {}
if (!rawKey) {
  try {
    rawKey = execSync('docker exec twenty-server-1 printenv APP_SECRET', {
      encoding: 'utf8',
    }).trim();
  } catch {}
}
if (!rawKey) {
  console.error('Khong tim thay ENCRYPTION_KEY / APP_SECRET trong container.');
  process.exit(1);
}

// 3) parse envelope: enc:v2:<keyId>:<iv+ct+tag>
const PREFIX = 'enc:v2:';
if (!envelope.startsWith(PREFIX)) {
  console.error('Khong phai envelope v2');
  process.exit(1);
}
const rest = envelope.slice(PREFIX.length); // <keyId>:<b64>
const sep = rest.indexOf(':');
const keyId = rest.slice(0, sep); // khong dung den, chi de dang doi soat
const b64 = rest.slice(sep + 1);
const buf = Buffer.from(b64, 'base64');
const iv = buf.subarray(0, 12);
const tag = buf.subarray(buf.length - 16);
const ct = buf.subarray(12, buf.length - 16apsed);

// 4) derive key dung HKDF-SHA256: info = twenty:enc:v2: + workspaceId
const hkdfInfo = Buffer.from(`twenty:enc:v2:${workspaceId}`);
const derivedKey = hkdfSync('sha256', Buffer.from(rawKey), Buffer.alloc(32), hkdfInfo, 32);

// 5) decrypt AES-256-GCM
const d = createDecipheriv('aes-256-gcm', derivedKey, iv);
d.setAuthTag(tag);
const plain = Buffer.concat([d.update(ct), d.final()]).toString('utf8');

console.log('=== SMTP password (plaintext, cua chinh ban) ===');
console.log(plain);
console.log('=== (do dai %d ky tu) ===', plain.length);
