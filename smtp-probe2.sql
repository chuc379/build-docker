\pset null '<NULL>'
\echo '=== A) number of connectedAccount (schema core) ==='
select count(*) as total
from core."connectedAccount";

\echo '=== B) top 20 connectedAccount: provider + handle(mask) + has connectionParameters ==='
select id,
       provider,
       case when handle like '%@%' then left(handle,3)||'***@'||split_part(handle,'@',2)
            else left(coalesce(handle,'<NULL>'),3)||'***' end as handle_masked,
       (connectionParameters is not null) as has_conn_params
from core."connectedAccount"
order by "createdAt" desc
limit 20;

\echo '=== C) SMTP/IMAP keys trong connectionParameters: KEY + do dai (mask chi in len, KHONG loi gia tri) ==='
select ca.id,
       rec.key,
       case when lower(rec.key) ~ 'pass|secret|token|auth|sendgrid|apikey'
            then 'len='||length(rec.value)||' [MASK]'
            when length(rec.value)=0 then '<EMPTY>'
            else left(rec.value,2)||'...'||right(rec.value,2)||' (len='||length(rec.value)||')'
       end as val_masked
from core."connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec(key,value)
where lower(rec.key) ~ 'smtp|imap|pass|host|user|port|auth|send|from|secret|token|apikey'
order by ca."createdAt" desc, rec.key
limit 60 DISPLAY_NONE;

\echo '=== D) all keys hien co trong connectionParameters (de so cac key khac lien quan email/smtp) ==='
select array_agg(distinct rec.key order by rec.key) as all_param_keys
from core."connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec(key,value);
