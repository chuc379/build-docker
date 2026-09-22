\pset null '<NULL>'
\pset pager off
\echo '=== D) parse JSON LONG trong connectionParameters: key "SMTP" -> sub-keys + masked (pass chi len) ==='
select ca.id as account_id,
       sub.key as sub_key,
       case
         when length(sub.value)=0 then '<EMPTY>'
         when lower(sub.key) ~ 'pass|token|auth|secret' then 'len='||length(sub.value)||' [MASKED:PASS]'
         else coalesce(left(sub.value,2),'?')||'...'||coalesce(right(sub.value,2),'?')||' (len='||length(sub.value)||')'
       end as sub_masked
from core."connectedAccount" ca,
     lateral (
       select l.key as key, l.value as value
       from jsonb_each_text(ca.connectionParameters) l
       where l.key ilike 'smtp'
     ) smtp,
     lateral jsonb_each_text(smtp.value::jsonb) as sub(key,value)
order by ca."createdAt" desc, sub.key;
