$ErrorActionPreference = 'SilentlyContinue'

function Mask($v) {
  if (-not $v) { return '(rong)' }
  if ($v.Length -le 2) { return ('***len=' + $v.Length) }
  return ('***len=' + $v.Length + ' (dau=' + $v.Substring(0,1) + '... cuoi=' + $v.Substring($v.Length-1,1) + ')')
}

Write-Output '================ PHAN 1: TAT CA builder ten kieu interview-email (de biet ban nao dinh dang can xu ly) ================'
$roots = 'D:\tina', 'D:\tina-tina-wf', 'D:\tina-tina', 'D:\tina', 'D:\tina\tina-wf'
$all = @()
foreach ($r in $roots) {
  if (-not (Test-Path -LiteralPath $r)) { continue }
  Push-Location $r
  $found = Get-ChildItem -LiteralPath $r -Recurse -Filter '*.builder.ts' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match 'interview-email|send-interview' }
  foreach ($f in $found) {
    $c = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
    $form   = ($c -match 'WorkflowActionType\.FORM')
    $single = ($c -match 'SINGLE_RECORD')
    $manual = ($c -match 'WorkflowTriggerType\.MANUAL')
    $all += [pscustomobject]@{
      Path   = $f.FullName
      Size   = $f.Length
      MTime  = $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
      FORM   = $form
      SINGLE = $single
      MANUAL = $manual
    }
  }
  Pop-Location
}
if ($all.Count -eq 0) { Write-Output '(khong tim thay builder nao khop pattern)' }
$all | Select-Object Path, Size, MTime, FORM, SINGLE, MANUAL |
  Format-Table -AutoSize -Wrap

Write-Output '================ PHAN 2: SMTP_PASSWORD / smtpPassword trong code + env (CHI key + do dai, KHONG hien gia tri) ================'
Write-Output '--- 2a) keys SMTP_* trong moi .env tren o dia (gia tri masked) ---'
Get-ChildItem -Path 'D:\tina','D:\tina-tina-wf','D:\tina-tina','D:\tina','D:\tina\tina-wf' -Recurse -Force -File -Include '.env','.env.*' -ErrorAction SilentlyContinue |
  ForEach-Object {
    $envFile = $_.FullName
    $line = Select-String -LiteralPath $envFile -Pattern 'SMTP|PASSWORD|SECRET' -Encoding UTF8
    if ($line) {
      Write-Output ("== {0}" -f $envFile)
      foreach ($m in $line) {
        $k = $m.Line.Trim()
        if ($k -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=') {
          $key = $Matches[1]
          $val = if ($k -match '=\s*(.*)$') { $Matches[1].Trim("`"", " ", "'''") } else { '' }
          Write-Output ("  {0} = {1}" -f $key, (Mask $val))
        }
      }
    }
  }

Write-Output '--- 2b) vitec xu ly smtpPassword trong code server (file:dong) ---'
Get-ChildItem -Path 'D:\tina\tina-wf\packages\twenty-server\src' -Recurse -File -Filter '*.ts' -ErrorAction SilentlyContinue |
  Select-String -Pattern 'smtpPassword|SMTP_PASSWORD|hasSendEmailRight|sendEmailRight' -Encoding UTF8 |
  ForEach-Object { ("{0}:{1}: {2}" -f $_.Path.Replace('D:\tina\tina-wf\',''), $_.LineNumber, $_.Line.Trim()) } |
  Select-Object -First 40

Write-Output '=== DONE ==='
