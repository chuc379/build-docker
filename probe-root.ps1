$ErrorActionPreference = 'SilentlyContinue'
$root = 'D:\tina\tina-wf'

Write-Output '########## 1) GPS root goc + git ##########'
Write-Output ('root={0}  exists={1}' -f $root, (Test-Path -LiteralPath $root))
Push-Location $root
Write-Output ('branch={0}  HEAD={1}' -f (git rev-parse --abbrev-ref HEAD), (git rev-parse --short HEAD))
Write-Output '--- git status (short) ---'
git status --short
Pop-Location

Write-Output '########## 2) TAT CA *.builder.ts trong root (FORM? SINGLE? MANUAL?) ##########'
$builders = Get-ChildItem -LiteralPath $root -Recurse -File -Filter '*.builder.ts' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'workflow-template' }
foreach ($b in $builders) {
  $c = Get-Content -LiteralPath $b.FullName -Raw -Encoding UTF8
  $form   = $c -match 'WorkflowActionType\.FORM'
  $single = $c -match 'SINGLE_RECORD'
  $manual = $c -match 'WorkflowTriggerType\.MANUAL'
  $rel = $b.FullName.Substring($root.Length)
  'FORM={0,-5} SINGLE_RECORD={1,-5} MANUAL={2,-5} {3,6}KB  {4}  {5}' -f $form, $single, $manual, [int]($b.Length/1024), $b.LastWriteTime.ToString('MM-dd HH:mm'), $rel
}

Write-Output '########## 3) SMTP config: chi in KEY + DO DAI password (mask) ##########'
function MaskValue($pad) {
  if ([string]::IsNullOrEmpty($pad)) { return '<RONG>' }
  $star = if ($pad.Length -le 0) { '' } else { ('*' * [Math]::Min(3, $pad.Length)) }
  return ('len={0} {1}' -f $pad.Length, $star)
}

$envFiles = Get-ChildItem -LiteralPath $root -Recurse -Force -File -Include '.env', '.env.*', 'docker-compose*.yml', 'docker-compose*.yaml' -ErrorAction SilentlyContinue
$printed = $false
foreach ($e in $envFiles) {
  $lines = Get-Content -LiteralPath $e.FullName -Encoding UTF8
  $hits = $lines | Where-Object { $_ -match 'SMTP|MAILER|smtp' }
  if ($hits) {
    $printed = $true
    Write-Output ('--- env: {0} ---' -f $e.FullName.Substring($root.Length))
    foreach ($h in $hits) {
      $m = [regex]::Match($h, '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$')
      if ($m.Success) {
        $key = $m.Groups[1].Value
        $val = $m.Groups[2].Value.Trim('"',"''")
        if ($key -match 'PASSWORD|PASS|SECRET|TOKEN') {
          ('  {0} = {1}  [CK: MASK]' -f $key, (MaskValue $val))
        } else {
          ('  {0} = {1}' -f $key, $val)
        }
      } else {
        ('  {0}' -f $h)
      }
    }
  }
}
if (-not $printed) { Write-Output '(KHONG thay SMTP nao trong .env/docker-compose cua root nay)' }

Write-Output '########## 4) SMTP_* trong source (chi key, khong in value) ##########'
$srcHits = Get-ChildItem -LiteralPath $root -Recurse -File -Include '*.ts', '*.tsx' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match 'workflow-template|email|smtp' } |
  ForEach-Object {
    $txt = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
    if ($txt -match 'smtpPassword|SMTP_PASSWORD|smtpConfig|hasSendEmailRight') { $_.FullName.Substring($root.Length) }
  } | Select-Object -Unique
$srcHits | ForEach-Object { "  + $_" }

Write-Output '########## 5) builder email: trigger block (FORM step la gi de bien) ##########'
$emailBuilder = Get-ChildItem -LiteralPath $root -Recurse -File -Filter '*.builder.ts' -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match 'interview' -and $_.Name -match 'email|mail' } |
  Select-Object -First 5
foreach ($eb in $emailBuilder) {
  Write-Output ('--- {0} ---' -f $eb.FullName.Substring($root.Length))
  $c = Get-Content -LiteralPath $eb.FullName -Raw -Encoding UTF8
  $hasForm   = $c -match 'WorkflowActionType\.FORM'
  $hasSingle = $c -match 'SINGLE_RECORD'
  $hasManual = $c -match 'WorkflowTriggerType\.MANUAL'
  $hasTriggerRecord = $c -match 'trigger\.record'
  '    FORM={0} SINGLE_RECORD={1} MANUAL={2} trigger.record={3}' -f $hasForm, $hasSingle, $hasManual, $hasTriggerRecord
}
Write-Output '=== DONE ==='
