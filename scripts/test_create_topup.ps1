try {
  $headers = @{ 'Content-Type' = 'application/json' }
  $body = @{ amount = 10000; credits = 10 } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri 'https://tailieu-hay.vercel.app/api/create-topup-order' -Method Post -Headers $headers -Body $body -ErrorAction Stop
  Write-Host "OK"
  $resp | ConvertTo-Json -Depth 5
} catch {
  Write-Host "ERROR:"
  try {
    if ($_.Exception.Response -ne $null) {
      $stream = $_.Exception.Response.GetResponseStream()
      $sr = New-Object System.IO.StreamReader($stream)
      Write-Host $sr.ReadToEnd()
    } else {
      Write-Host $_.Exception.Message
    }
  } catch {
    Write-Host 'Full exception:'
    $_ | Format-List * -Force
  }
}
