# Pathways.io deploy - pulls the newest Claude bundle from _incoming into main
# and pushes it to GitHub (which triggers the Pages deploy to colecarter.io).
#
# Usage (from anywhere):
#   .\scripts\deploy.ps1                          newest bundle in _incoming
#   .\scripts\deploy.ps1 -Bundle _incoming\all-updates.bundle
#   .\scripts\deploy.ps1 -Force                   local main exactly matches the bundle,
#                                                 discarding local-only commits on main
#
# If PowerShell refuses to run scripts ("running scripts is disabled"), use:
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1

param(
  [string]$Bundle = "",
  [switch]$Force
)

function Fail($msg) { Write-Host ""; Write-Host "[X] $msg" -ForegroundColor Red; exit 1 }
function Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }

# --- 1. locate the repository (parent of this script's folder) ---
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repo
Step "Repository: $repo"

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Fail "This folder is not a git repository." }

# make sure we are on main
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
  Step "Switching to main (was on '$branch')"
  git checkout main
  if ($LASTEXITCODE -ne 0) { Fail "Could not check out main." }
}

# --- 2. pick the bundle ---
if (-not $Bundle) {
  $candidates = Get-ChildItem -Path (Join-Path $repo "_incoming") -Filter *.bundle -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  if (-not $candidates) { Fail "No .bundle files found in _incoming\ - nothing to deploy." }
  $Bundle = $candidates[0].FullName
}
Step "Using bundle: $Bundle"

git bundle verify "$Bundle"
if ($LASTEXITCODE -ne 0) {
  Fail "Bundle verification failed - it may need commits this repo does not have yet. Re-run with:  .\scripts\deploy.ps1 -Bundle _incoming\all-updates.bundle  (that one carries the full history)."
}

# work from a temp copy: the original lives inside the repo, so a stash of
# untracked files (below) would otherwise remove it before the fetch
$workBundle = Join-Path $env:TEMP "pathways-deploy.bundle"
Copy-Item -Path $Bundle -Destination $workBundle -Force

# --- 3. stash any local changes so the merge cannot be blocked ---
$dirty = git status --porcelain
$stashed = $false
if ($dirty) {
  Step "Local changes detected - stashing them while main updates"
  git stash push -u -m "deploy.ps1 auto-stash"
  if ($LASTEXITCODE -eq 0) { $stashed = $true } else { Fail "Could not stash local changes." }
}

# --- 4. bring the bundle's commits into main ---
Step "Fetching commits from the bundle"
git fetch "$workBundle" main
if ($LASTEXITCODE -ne 0) {
  if ($stashed) { git stash pop | Out-Null }
  Fail "git fetch from the bundle failed."
}

git merge --ff-only FETCH_HEAD
if ($LASTEXITCODE -ne 0) {
  if ($Force) {
    Step "Fast-forward not possible - resetting main to match the bundle (-Force)"
    git reset --hard FETCH_HEAD
    if ($LASTEXITCODE -ne 0) { Fail "git reset failed." }
  } else {
    if ($stashed) { git stash pop | Out-Null }
    Fail "Local main has diverged from the bundle (commits exist here that the bundle does not know about). Re-run with -Force to make main exactly match the bundle, or resolve manually with:  git merge FETCH_HEAD"
  }
}

# --- 5. push to GitHub ---
Step "Pushing main to origin"
git push origin main
if ($LASTEXITCODE -ne 0) {
  if ($stashed) { Step "Restoring stashed local changes"; git stash pop }
  Write-Host ""
  Write-Host "[X] Push failed. Work through these in order:" -ForegroundColor Red
  Write-Host "    1. Authentication - run 'git push origin main' by itself; Git Credential Manager may be waiting"
  Write-Host "       with a browser sign-in window (check behind other windows / the taskbar)."
  Write-Host "    2. Remote URL - 'git remote -v' should show https://github.com/colebucket06/colecarterio.git"
  Write-Host "       If not:  git remote set-url origin https://github.com/colebucket06/colecarterio.git"
  Write-Host "    3. Rejected non-fast-forward - GitHub has commits this machine lacks. Run:"
  Write-Host "       git pull origin main   then re-run   .\scripts\deploy.ps1"
  Write-Host "       (or, if GitHub should simply match this machine:  git push origin main --force-with-lease)"
  exit 1
}

if ($stashed) {
  Step "Restoring stashed local changes"
  git stash pop
}

Step "Done - pushed to GitHub. Actions is now building and deploying to colecarter.io"
git log --oneline -5
