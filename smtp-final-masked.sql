\pset pager off
\echo '=== E) connectionParameters -> SMTP (nested {"SMTP": {...}}) -> moi key con + VALUE masked ==='
select ca.id,
       sub.key,
       case when length(sub.value)=0 then '<EMPTY>'
            when lower(sub.key) ~ 'pass|secret|token|auth' then 'len='||length(sub.value)||' [MASKED:PASS]'
            else left(sub.value,2)||'...'||right(sub.value,2)||' (len='||length(sub.value)||')' end as value_masked
from core."connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as smtp(key,value),
     lateral (
       select rec2.key as key, rec2.value as value
       from jsonb_each_text(coalesce(smtp.value::jsonb,'{}'::jsonb)) as rec2(key,value)
     ) sub
where smtp.key ilike 'SMTP%'
  and jsonb_typeof(smtp.value::jsonb)='object'
order by ca."createdAt" desc, sub.key;
