param(
  [string]$OutputPath = "website/downloads/shadowinput-extension.zip"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$outputFullPath = Join-Path $repoRoot $OutputPath
$outputDir = Split-Path -Parent $outputFullPath

if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

if (Test-Path $outputFullPath) {
  Remove-Item $outputFullPath -Force
}

$packageItems = @(
  "manifest.json",
  "background.js",
  "content",
  "styles",
  "icons",
  "popup",
  "options"
)

Compress-Archive -Path $packageItems -DestinationPath $outputFullPath -CompressionLevel Optimal -Force
Write-Host "Built:" $outputFullPath
