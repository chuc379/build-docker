$ErrorActionPreference = 'SilentlyContinue'
$root = 'D:\tina\tina-wf'
Write-Output '=== 1) service decrypt password SMTP (tim dung class xu ly enc:v2 + key env cua Twenty) ==='
$candidate = @(
  "$root\packages\twenty-server\src\modules\connected-account\services\connected-account-token-encryption.service.ts",
  "$root\packages\twenty-server\src\modules\connected-account\services\connected-account-encryption.service.ts",
  "$root\packages\twenty-server\src\engine\core-modules\secret-encryption\secret-encryption.service.ts"
)
foreach ($f in $candidate) {
  if (Test-Path -LiteralPath $f) {
    Write-Output ('--- {0} ---' -f $f.Substring($root.Length))
    Select-String -LiteralPath $f -Pattern 'decrypt|encrypt|enc:|createDecipher|createCipher|_key|getKey|ENCRYPTION|process\.env|SALT|iv' -Encoding UTF8 |
      ForEach-Object { '  L{0}: {1}' -f $_.LineNumber, $_.Line.Trim() } | Select-Object -First 30
  }
}
Write-Output '=== 2) dung env nao lam encription key + cau hinh tong trong .env cua server (key: MA_SK len, khong gia tri) ==='
$envF = "$root\.env"
if (Test-Path -LiteralPath $envF) {
  Select-String -LiteralPath $envF -Pattern '^APP_ENCRYPTION_KEY|^ENCRYPTION_KEY|^APP_SECRET|^CIPHER|^SALT|^SECRET' -Encoding UTF8 |
    ForEach-Object {
      $line = $_.Line
      $key = if ($line -match '^([A-Z_]+)=') { $Matches[1] } else { '?' }
      $val = if ($line -match '=(.+)$') { $Matches[1].Trim().Trim('"') } else { '' }
      '{0}  (len={1})' -f $key, $val.Length
    }
} else {
  Write-Output '(khong co .env root; key encryption chac lay tu env cua docker-compose)'
}
Write-Output '=== 3) truy vet: khi tail/send email tool goi OpenAI/smtpSslCaldav thi dung connectionParameters.SMTP.password; xem tool do co goi decrypt service ko ==='
$f2 = "$root\packages\twenty-server\src\engine\core-modules\tool\tools\email-tool\send-email-tool.ts"
if (Test-Path -LiteralPath $f2) {
  Select-String -LiteralPath $f2 -Pattern 'smtpPassword|connectionParameters|SMTP|decrypt|decryptConnectionParameters|smtpPort|smtpHost|smtpUser' -Encoding UTF8 |
    ForEach-Object { '  L{0}: {1}' -f $_.LineNumber, $_.Line.Trim() } | Select-Object -First 25
} else {
  Write-Output ('(khong thay: {0})' -f $f2)
  Get-ChildItem -LiteralPath "$root\packages\twenty-server\src" -Recurse -File -Filter '*send-email-tool.ts' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
}
