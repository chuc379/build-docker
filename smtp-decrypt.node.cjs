const crypto = require('crypto');
const { execSync } = require('child_process');

const exec = (cmd, nullOk = false) => {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    if (nullOk) return '';
    throw e;
  }
};

// ---- 1) du lieu tu DB (core.connectedAccount + connectionParameters.SMTP.password + workspaceId) ----
const row = execSync(
  `docker exec twenty-db-1 psql -U postgres -d default -At -X -v ON_ERROR_STOP=1 -c "set client_encoding='UTF8'; select ca.id||chr(31)||ca.\"workspaceId\"||chr(31)||chd.value from core.\"connectedAccount\" ca cross join lateral jsonb_to_record(coalesce(ca.\"connectionParameters\",'{}'::jsonb)) as top(\"SMTP\" jsonb) cross join lateral jsonb_to_record(top.\"SMTP\") as chd(password text) order by ca.\"createdAt\" desc limit 1"`,
  { encoding: 'utf8' },
)
  .trim()
  .split('\u001f');

const [accountId, workspaceIdOrNull, envelope] = row;
const workspaceId = workspaceIdOrNull === 'null' ? null : workspaceIdOrNull;

console.log('accountId      :', accountId);
console.log('workspaceId    :', workspaceId);
console.log('envelope [0:30]:', envelope.slice(0, 12) + '...' + envelope.slice(-18));

// ---- 2) rawKey: ENCRYPTION_KEY (primary) hoac APP_SECRET (fallback), tu env server container ----
let rawKeyWithNewline = exec('docker exec twenty-server-1 printenv ENCRYPTION_KEY', true);
let source = 'ENCRYPTION_KEY';
if (!rawKeyWithNewline) {
  rawKeyWithNewline = exec('docker exec twenty-server-1 printenv APP_SECRET', true);
  source = 'APP_SECRET';
}
if (!rawKeyWithNewline) {
  throw new Error('Khong tim thay ENCRYPTION_KEY / APP_SECRET trong env server container');
}
const rawKey = rawKeyWithNewline.replace(/^\s+|\s+$/g, '').replace(/\r?\n/g, '');
console.log('''smtp.rawKey source :', source, '| len =', Buffer.byteLength(rawKey, 'utf8'));

// ---- 3) envelope v2: enc:v2:<keyId>:<b64payload> ; payload = iv(12) || ct || tag(16) ----
const V2_PREFIX = 'enc:v2:';
if (!envelope.startsWith(V2_PREFIX)) throw new Error('Khong phai envelope v2');
const afterPrefix = envelope.slice(V2_PREFIX.length); // <keyId>:<payload>
const sep = afterPrefix.indexOf(':');
const payloadB64 = afterPrefix.slice(sep + 1);
const buf = Buffer.from(payloadB64, 'base64');
const IV_LEN = 12;
const TAG_LEN = 16;
const iv = buf.subarray(0, IV_LEN);
const tag = buf.subarray(buf.length - TAG_LEN);
const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN(".length"));
const keyId = afterPrefix.slice(0, sep);
console.log('envelope keyId  :', keyId, '| payload len =', buf.length, '| iv.len =', iv.length, '| tag.len =', tag.length);

// ---- 4) derive GCM key: HKDF-SHA256 (rawKey, ZERO_SALT=32 bytes 0x00, info='twenty:enc:v2:'+ctx, len 32) ----
const HKDF_INFO_PREFIX = 'twenty:enc:v2:';
const INSTANCE_CONTEXT = 'instance';
const context = workspaceId ?? INSTANCE_CONTEXT;
const derivedKey = crypto.hkdfSync(
  'sha256',
  Buffer.from(rawKey, 'utf8'),
  Buffer.alloc(32), // ZERO_SALT
  Buffer.from(`${HKDF_INFO_PREFIX}${context}`, 'utf8'),
  32,
);
console.log('HKDF info      :', HKDF_INFO_PREFIX + context, '| key.len =', derivedKey.length);

// ---- 5) AES-256-GCM decrypt + in plaintext ----
const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
decipher.setAuthTag(tag);
const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
console.log('');
console.log('=== PLAINTEXT SMTP PASSWORD (mk trong connectedAccount cua ban) ===');
console.log(plaintext);
console.log('=== (do dai %d ky tu) ===', Buffer.byteLength(plaintext, 'utf8'));
