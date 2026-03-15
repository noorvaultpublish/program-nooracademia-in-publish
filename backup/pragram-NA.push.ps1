# 1. Define Paths relative to script location
$projectRoot = Get-Item "$PSScriptRoot\.." 
$destination = Resolve-Path (Join-Path $projectRoot.FullName "..\..\GIT\program-nooracademia.in\")
$excludeDir  = "backup"
$currentTime = Get-Date -Format "yyyy-MM-dd HH:mm"
# Fallback format: COMMIT-$USER-DD-MM-YY-HH-mm-ss
$timestampFallback = "COMMIT-$env:USERNAME-$(Get-Date -Format 'dd-MM-yy-HH-mm-ss')"

Write-Host "--- Starting Sync for nooracademia.in ---" -ForegroundColor Cyan

# 2. Sync files from Local to GIT folder
if (!(Test-Path $destination)) {
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
}

$items = Get-ChildItem -Path "$($projectRoot.FullName)\*" -Exclude $excludeDir
foreach ($item in $items) {
    Copy-Item -Path $item.FullName -Destination $destination -Recurse -Force
}
Write-Host "Local files synced to GIT directory." -ForegroundColor Green

# 3. Git Operations
Push-Location $destination

try {
    Write-Host "Running Git commands..." -ForegroundColor Yellow
    
    git add .
    
    # Check for changes
    $status = git status --porcelain
    if ($status) {
        # 3a. Get the 'diff' to show Gemini what changed
        $diffSummary = git diff --cached --stat
        $aiComment = ""

        # 3b. Attempt to get comment from Gemini
        try {
            $apiKey = $env:GEMINI_API_KEY # Assumes key is set in Env Variables
            if ($apiKey) {
                $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey"
                $prompt = "Provide a one-sentence git commit message for these changes. Do not include quotes or conversational filler: `n$diffSummary"
                
                $body = @{ contents = @(@{ parts = @(@{ text = $prompt }) }) } | ConvertTo-Json
                
                Write-Host "Fetching AI remark..." -ForegroundColor Magenta
                $response = Invoke-RestMethod -Uri $apiUrl -Method Post -ContentType "application/json" -Body $body
                $aiComment = $response.candidates[0].content.parts[0].text.Trim()
            }
        } catch {
            Write-Host "Could not reach Gemini. Using fallback remark." -ForegroundColor Gray
        }

        # 3c. Logic: Use AI comment if available, else use custom fallback
        if ([string]::IsNullOrWhiteSpace($aiComment)) {
            $finalComment = $timestampFallback
        } else {
            $finalComment = $aiComment
        }

        git commit -m "$finalComment"
        git push
        Write-Host "Git Push Successful! Remark: $finalComment" -ForegroundColor Green
    } else {
        Write-Host "No changes detected. Git push skipped." -ForegroundColor White
    }
}
catch {
    Write-Host "An error occurred during the Git process: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Pop-Location
}

Write-Host "`n--- Process Complete ---" -ForegroundColor Cyan

# 4. Pause Button
Read-Host -Prompt "Press Enter to exit"