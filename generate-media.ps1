# Regenerate media manifest from media/ folder with style categories
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mediaDir = Join-Path $scriptDir 'media'
$ext = @('.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov')

$categoryOrder = @{
  editorial  = 1
  beauty     = 2
  portrait   = 3
  press      = 4
  video      = 5
}

function Get-MediaCategory {
  param([string]$FileName)

  $lower = $FileName.ToLower()

  if ($lower -match '\.(mp4|mov)$') { return 'video' }
  if ($lower -match '^img_646[5-9]\.') { return 'portrait' }
  if ($lower -match '^img_647[0-9]\.') { return 'portrait' }
  if ($lower -match '^img_648[0-2]\.') { return 'portrait' }
  if ($lower -match '^img_6483\.') { return 'editorial' }
  if ($lower -match '^img_64') { return 'editorial' }
  if ($lower -match '^photo_.*_2026-07-06') { return 'beauty' }
  if ($lower -match '^photo_12_.*_2026-07-05') { return 'portrait' }
  if ($lower -match '^photo_8_.*_2026-07-05') { return 'editorial' }
  if ($lower -match '^photo_1_.*_2026-07-05') { return 'press' }
  if ($lower -match '^photo_.*_2026-07-05') { return 'press' }
  if ($lower -match '^619461765_') { return 'press' }
  if ($lower -match '^624845571_') { return 'portrait' }
  if ($lower -match '^\d+_\d+_n\.') { return 'editorial' }

  return 'editorial'
}

if (-not (Test-Path -LiteralPath $mediaDir)) {
  New-Item -ItemType Directory -Path $mediaDir -Force | Out-Null
}

$files = Get-ChildItem -LiteralPath $mediaDir -File |
  Where-Object { $ext -contains $_.Extension.ToLower() } |
  ForEach-Object {
    $category = Get-MediaCategory -FileName $_.Name
    [PSCustomObject]@{
      name     = "media/$($_.Name)"
      type     = if ($_.Extension -match '\.(mp4|mov)$') { 'video' } else { 'image' }
      category = $category
      order    = $categoryOrder[$category]
    }
  } |
  Sort-Object order, name

$items = $files | ForEach-Object {
  [ordered]@{
    name     = $_.name
    type     = $_.type
    category = $_.category
  }
}

$json = @{ items = @($items) } | ConvertTo-Json -Depth 4
Set-Content -LiteralPath (Join-Path $scriptDir 'media.json') -Value $json -Encoding UTF8

$jsItems = ($items | ConvertTo-Json -Compress) -replace '\\', '/'
$jsContent = "window.MEDIA_ITEMS = $jsItems;"
$jsPath = Join-Path $scriptDir 'js\media-data.js'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($jsPath, $jsContent, $utf8)

Write-Host "Generated $($items.Count) media items:"
$files | Group-Object category | Sort-Object { $categoryOrder[$_.Name] } | ForEach-Object {
  Write-Host "  $($_.Name): $($_.Count)"
}
