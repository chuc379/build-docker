\pset null '<NULL>'
\echo '=== giai ma value cua key SMTP (204 chars): no la JSON? co key con nao la password/secret khong (mask, chi do dai) ==='
with p as (
  select ca.id,
         rec.value as smtp_raw
  from core.\"connectedAccount\" ca,
       lateral jsonb_each_text(coalesce(ca.\"connectionParameters\",'{}'::jsonb)) as rec(key,value)
  where rec.key='SMTP'
)
select p.id,
       case when smtp_raw like '{%' then 'IS_JSON'
            when smtp_raw like '[%' then 'IS_ARRAY'
            else 'PLAIN_TEXT' end as smtp_value_type,
       length(smtp_raw) as smtp_value_len
from p;

\echo '=== neu IS_JSON: gen gia tri (len hoac [MASK]) cua moi sub-key lien quan pass/smtp/port/host ==='
with p as (
  select ca.id, rec.value as smtp_raw
  from core.\"connectedAccount\" ca,
       lateral jsonb_each_text(coalesce(ca.\"connectionParameters\",'{}'::jsonb)) as rec(key,value)
  where rec.key='SMTP'
)
select p.id,
       sub.key as sub_key,
       case when length(sub.value)=0 then '<EMPTY>'
            when lower(sub.key) ~ 'pass|secret|token|auth' then 'len='||length(sub.value)||' [MASK:password]'
            else 'len='||length(sub.value) end as sub_masked
from p,
     lateral jsonb_each_text(coalesce(p.smtp_raw::jsonb,'{}'::jsonb)) as sub(key,value)
order by sub.key;
