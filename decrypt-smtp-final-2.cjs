const { hkdfSync, createDecipheriv } = require('crypto');
const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

// ================= 1) inputs tu DB (docker exec khoi pipe/kebab de kho break) =================
function dbScalar(sql) {
  try {
    const out = execSync(
      'docker exec twenty-db-1 psql -U postgres -d default -At -v ON_ERROR_STOP=1 -c "' + sql.replace(/"/g, '""') + '"',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return out;
  } catch {
    return '';
  }
}

const workflowId = dbScalar(
  `select wf.id from core."workflow" wf join core."workflowVersion" wv on wv."workflowId"=wf.id where wv.name='Gửi email ký xác nhận phỏng vấn' order by wv."createdAt" desc limit 1`,
);
const envelope = dbScalar(
  `select ca."connectionParameters" ? 'SMTP' from core."connectedAccount" ca where ca."createdAt" is not null order by ca."createdAt" desc limit 1`,
);

// find the actual SMTP password envelope via jsonb
const full = dbScalar(
  `select rec2.value from core."connectedAccount" ca, lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec1(key,value), lateral jsonb_each_text(coalesce(regexp_replace(rec1.value,'^.Store.'''??''''),'')) ... `,
);
console.log('placeholder');
