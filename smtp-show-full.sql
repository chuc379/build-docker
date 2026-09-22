\pset null '<NULL>'
\pset pager off
\echo '=== TOAN BO SMTP dang luu trong connectedAccount (NOT mask - chu so huu muon xem) ==='
select id,
       provider,
       handle
from core."connectedAccount"
where connectionParameters is not null
order by "createdAt" desc
limit 5;

\echo '=== nested SMTP: sub-keys day du (host/user/password/port/security...) ==='
select rec.key,
       rec.value
from core."connectedAccount" ca,
     lateral jsonb_each(coalesce(ca."connectionParameters",'{}'::jsonb)) as top(key,value),
     lateral jsonb_each_text(coalesce(top.value,'{}'::jsonb)) as rec(key,value)
where top.key='SMTP'
order by rec.key;
