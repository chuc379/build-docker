\pset null '<NULL>'
\pset pager off
\echo '=== E-FINAL) nested object SMTP (len 204) -> moi sub-key con: masked ==='
select ca.id,
       sub.key as sub_key,
       case when length(sub.value)=0 then '<EMPTY>'
            when lower(sub.key) ~ 'pass|token|secret|auth' then 'len='||length(sub.value)||' [MASKED:PASS]'
            else left(sub.value,2)||'...'||right(sub.value,2)||' (len='||length(sub.value)||')' end as sub_masked
from core."connectedAccount" ca,
     lateral jsonb_each(coalesce(ca."connectionParameters",'{}'::jsonb)) as top(key,value),
     lateral jsonb_each_text(case when jsonb_typeof(top.value)='object' then top.value else '{}'::jsonb end) as sub(key,value)
where top.key = 'SMTP'
order by ca."createdAt" desc, sub.key;
