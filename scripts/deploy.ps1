# Apply the newest bundle from _incoming (if any) and deploy via GitHub Pages.
# Usage:  .\scripts\deploy.ps1            (auto-picks newest bundle)
#         .\scripts\deploy.ps1 -Bundle _incoming\name.bundle
param([string]$Bundle = "")
Set-Location "$PSScriptRoot\.."
if ($Bundle -eq "" -and (Test-Path _incoming)) {
  $b = Get-ChildItem _incoming\*.bundle -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($b) { $Bundle = $b.FullName }
}
if ($Bundle) {
  Write-Host "Applying $Bundle"
  git pull $Bundle main
}
git push origin main
Write-Host "Pushed - GitHub Actions is now building and deploying (repo Actions tab)."
