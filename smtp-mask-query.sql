\pset null '<NULL>'
\pset pager off
\echo '=== A) connectedAccount trong schema core (db default) ==='
select count(*) as total
from core."connectedAccount";

\echo '=== B) 20 moi nhat: provider + handle(mask) + has_params ==='
select id,
       provider,
       case when handle like '%@%' then left(handle,3)||'***@'||split_part(handle,'@',2)
            else left(coalesce(handle,'<NULL>'),3)||'***' end as handle_masked,
       (connectionParameters is not null) as has_params
from core."connectedAccount"
order by "createdAt" desc
limit 20;

\echo '=== C) toan bo key trong connectionParameters: key mask + do dai (khong gia tri) ==='
select ca.id,
       rec.key,
       case when length(rec.value)=0 then '<EMPTY>'
            when lower(rec.key) ~ 'pass|token|auth|secret' then 'len='||length(rec.value)||' [MASKED:PASS]'
            else left(rec.value,40) end as value_masked
from core."connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec(key,value)
order by ca."createdAt" desc, rec.key
limit 40;
