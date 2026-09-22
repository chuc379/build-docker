\pset null '<NULL>'
\echo '=== 1) connectedAccounts: provider + handle (mask middle) + co connectionParameters khong ==='
select id,
       provider,
       (case when handle like '%@%'
             then left(handle, 2) || '***@' || split_part(handle,'@',2)
             else left(coalesce(handle,'<NULL>'),2) || '***' end) as handle,
       (connectionParameters is not null) as has_conn_params,
       to_char("createdAt",'YYYY-MM-DD HH24:MI') as created
from "connectedAccount"
order by "createdAt" desc
limit 20;

\echo '=== 2) cac key trong connectionParameters lien quan SMTP + do dai gia tri (KHONG hien gia tri) ==='
select ca.id,
       rec.key,
       (case when rec.value is null then '<NULL>'
             when length(rec.value)=0 then '<EMPTY>'
             when lower(rec.key) like '%password%' or lower(rec.key) like '%secret%' or lower(rec.key) like '%token%' or lower(rec.key) like '%auth%'
             then 'len='||length(rec.value)||'  [MASK duoc]'
             else rec.value end) as val_masked
from "connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec(key,value)
where lower(rec.key) like '%smtp%'
   or lower(rec.key) like '%mail%'
   or lower(rec.key) like '%host%'
   or lower(rec.key) like '%port%'
   or lower(rec.key) like '%encrypt%'
   or lower(rec.key) like '%auth%'
order by ca."createdAt" desc, rec.key
limit 80;

\echo '=== 3) toan bo danh sach key co trong connectionParameters (tru nao co key giong password) ==='
select array_agg(distinct rec.key order by rec.key) as keys
from "connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec(key,value);
