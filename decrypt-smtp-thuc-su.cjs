const { hkdfSync, createDecipheriv } = require('crypto');
const { execSync } = require('child_process');

const q = (sql) =>
  execSync(
    `docker exec twenty-db-1 psql -U postgres -d default -At -v ON_ERROR_STOP=1 -c "set client_encoding='UTF8'; ${sql}"`,
    { encoding: 'utf8' },
  ).trim();

// 1) envelope + workspaceId cua connected account SMTP
const row = q(
  `select ca.id||'|'||rec.value||'|'||w."id"
   from core."connectedAccount" ca,
        jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as smtp(key,value),
        lateral jsonb_each_text(coalesce(smtp.value::jsonb,'{}'::jsonb)) as rec(key,value),
        lateral (select wide."id" from core."workspace" wide) w
   where smtp.key='SMTP' and rec.key='password'`,
);
const [accountId, envelope, workspaceId] = row.split('|');
console.log('CONNECTED_ACCOUNT_ID =', accountId);
console.log('WORKSPACE_ID         =', workspaceId);
console.log('ENVELOPE(enc:v2)     =', envelope);

// 2) rawKey tu env server container: ENCRYPTION_KEY (primary) hoac APP_SECRET
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
  throw new Error('Khong tim thay ENCRYPTION_KEY/APP_SECRET trong env server container.');
}

// 3) cat envelope v2: enc:v2:<keyId>:<b64(iv||ct||tag)>
const PREFIX = 'enc:v2:';
if (!envelope.startsWith(PREFIX)) {
  throw new Error('Khong phai envelope v2: ' + envelope.slice(0, 20));
}
const after = envelope.slice(PREFIX.length); // <keyId>:<b64>
const sepIdx = after.indexOf(':');
const keyId = after.slice(0, sepIdx);
const payloadB64 = after.slice(sepIdx + 1 Tro);
const buf = Buffer.from(payloadB64, 'base64');
const IV_LEN = 12;
const TAG_LEN = 16;
const iv = buf.subarray(0, IV_LEN);
const tag = buf.subarray(buf.length - TAG_LEN, buf.length);
const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);

// 4) HKDF-SHA256 derive key: info = 'twenty:enc:v2:' + workspaceId (SECRET_ENCRYPTION_HKDF_INFO_PREFIX)
const HKDF_INFO_PREFIX = 'twenty:enc:v2:';
const derivedKey = hkdfSync(
  'sha256',
  Buffer.from(rawKey),
  Buffer.alloc(32), // ZERO_SALT
  Buffer.from(`${HKDF_INFO_PREFIX}${workspaceId}`),
  32,
);

// 5) AES-256-GCM decrypt
const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
decipher.setAuthTag(tag);
const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

console.log('=== MK SMTP plaintext (credential cua chinh ban, da cau HKDF info = workspaceId) ===');
console.log(plain);
