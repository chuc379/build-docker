$ErrorActionPreference = 'SilentlyContinue'

Write-Output '=== TIM TAT CA builder hr-send-interview-email hoac hr-send-interview .ts tren o dia ==='
$hits = Get-ChildItem -Path 'D:\','D:\tina' -Recurse -Filter 'hr-*interview*.builder.ts' -File -ErrorAction SilentlyContinue |
  Where-Object FullName -match 'builder' |
  Select-Object FullName, Length, LastWriteTime, LastAccessTime

if (-not $hits) { Write-Output '(KHONG tim thay file nao, hoac khong du quyen doc)' }
else {
  $hits | Sort-Object FullName | ForEach-Object {
    $hasForm = Select-String -LiteralPath $_.FullName -Pattern 'WorkflowActionType\.FORM' -Encoding UTF8 -Quiet
    $hasSingle = Select-String -LiteralPath $_.FullName -Pattern 'SINGLE_RECORD|trigger\.record' -Encoding UTF8 -Quiet
    $hasManual = Select-String -LiteralPath $_.FullName -Pattern 'WorkflowTriggerType\.MANUAL' -Encoding UTF8 -Quiet
    $tag = if ($hasForm) { 'FORM' } else { 'no-FORM' }
    "{0}`n  MODIFIED={1} HEAD-sm={2} FORM={3} SINGLE/trigger.record={4} MANUAL={5}`n" -f `
      $_.FullName, $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'), $hits[0].LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'), $hasForm, $hasSingle, $hasManual
  }
}
Write-Output '=== DONE ==='
