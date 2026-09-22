select
  rec2.key2,
  case
    when lower(rec2.key2) ~ 'pass|secret|token|auth' then 'len='||length(rec2.value2)||' [MASK:password]'
    when length(rec2.value2)=0 then '<EMPTY>'
    else left(rec2.value2,2)||'...'||right(rec2.value2,2)||' (len='||length(rec2.value2)||')'
  end as masked
from core."connectedAccount" ca,
     lateral jsonb_each_text(coalesce(ca."connectionParameters",'{}'::jsonb)) as rec1(key1,value1),
     lateral (select case when rec1.value1 like '{%' then jsonb_each_text(rec1.value1::jsonb) end) as rec2(key2,value2)
where rec1.key1 ilike 'smtp%'
  and rec2.key2 is not null
order by rec2.key2;
