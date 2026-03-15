# Get the directory where THIS script is currently saved
$currentFolder = $PSScriptRoot

# Go one level up (F:\NoorAcdemia\local\program-nooracademia.in\)
$parentFolder = Split-Path -Path $currentFolder -Parent

# Define the timestamp and final backup path
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$destination = Join-Path -Path $currentFolder -ChildPath "compiler_$timestamp.zip"

# Get all items in the parent, excluding the 'backup' folder we are sitting in
Get-ChildItem -Path $parentFolder -Exclude "backup" | Compress-Archive -DestinationPath $destination -Force

Write-Host "Backup created successfully at: $destination" -ForegroundColor Green