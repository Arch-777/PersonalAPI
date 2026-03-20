# Branch Protection Setup Script (PowerShell)
# Applies GitHub branch protection rules to main branch requiring analytics smoke tests

param(
  [string]$Owner = "Arch-777",
  [string]$Repo = "PersonalAPI",
  [string]$Branch = "main"
)

$repoPath = "$Owner/$Repo"
Write-Host "Setting up branch protection for $repoPath/$Branch" -ForegroundColor Cyan
Write-Host "=" * 60

# Create branch protection rule JSON
$protectionRule = @{
  required_status_checks        = @{
    strict   = $true
    contexts = @(
      "analytics-smoke-fast",
      "analytics-smoke-full"
    )
  }
  enforce_admins                = $true
  required_pull_request_reviews = $null
  restrictions                  = $null
  allow_force_pushes            = $false
  allow_deletions               = $false
} | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "Attempting to apply branch protection rules via GitHub CLI..." -ForegroundColor Yellow

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName() | Rename-Item -NewName { $_.Name -replace '\.tmp$', '.json' } -PassThru
$protectionRule | Out-File -FilePath $tempFile -Encoding UTF8

# Apply via gh CLI
try {
  $output = gh api repos/$repoPath/branches/$Branch/protection `
    --method PUT `
    --input $tempFile 2>&1

  if ($LASTEXITCODE -eq 0) {
    Write-Host "" 
    Write-Host "✓ Branch protection rules applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying applied rules:" -ForegroundColor Cyan
    gh api repos/$repoPath/branches/$Branch/protection | jq '.required_status_checks.contexts'
    
    Remove-Item -Path $tempFile -Force
    exit 0
  }
  else {
    throw "gh CLI returned exit code $LASTEXITCODE"
  }
}
catch {
  Write-Host "✗ GitHub API call failed" -ForegroundColor Red
  Write-Host "Status: $output" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "This is common on some repository configurations due to API permissions." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "MANUAL FALLBACK: Apply rules via GitHub Web UI:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "1. Navigate to: https://github.com/$repoPath/settings/branches" -ForegroundColor White
  Write-Host ""
  Write-Host "2. Click 'Add rule'" -ForegroundColor White
  Write-Host ""
  Write-Host "3. Configure:" -ForegroundColor White
  Write-Host "   Branch name pattern: main" -ForegroundColor DarkGray
  Write-Host "   ✓ Require a pull request before merging" -ForegroundColor DarkGray
  Write-Host "   ✓ Require status checks to pass before merging" -ForegroundColor DarkGray
  Write-Host "     • Search field and add: analytics-smoke-fast" -ForegroundColor DarkGray
  Write-Host "     • Search field and add: analytics-smoke-full" -ForegroundColor DarkGray
  Write-Host "   ✓ Require branches to be up to date before merging" -ForegroundColor DarkGray
  Write-Host "   ✓ Include administrators in restrictions" -ForegroundColor DarkGray
  Write-Host "   ✗ Allow force pushes: Do not allow" -ForegroundColor DarkGray
  Write-Host "   ✗ Allow deletions: Do not allow" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "4. Click 'Create'" -ForegroundColor White
  Write-Host ""
  Write-Host "For details, see: frontend/docs/BRANCH_PROTECTION_SETUP.md" -ForegroundColor Cyan
  
  Remove-Item -Path $tempFile -Force
  exit 1
}
