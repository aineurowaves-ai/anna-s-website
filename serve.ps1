$port = 8080
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Portfolio: http://localhost:$port/"
Write-Host "Ctrl+C to stop"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.png'  = 'image/png'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.mp4'  = 'video/mp4'
  '.mov'  = 'video/quicktime'
  '.pdf'  = 'application/pdf'
}

function Send-Response {
  param($Context, $StatusCode, $Body, $ContentType)

  $response = $Context.Response
  $response.StatusCode = $StatusCode
  $response.ContentType = $ContentType
  $buffer = [Text.Encoding]::UTF8.GetBytes($Body)

  try {
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
  } catch {
    # Client closed connection early (favicon probe, cancelled media, etc.)
  } finally {
    try { $response.OutputStream.Close() } catch {}
    try { $response.Close() } catch {}
  }
}

function Send-File {
  param($Context, $FilePath)

  $response = $Context.Response
  $ext = [IO.Path]::GetExtension($FilePath).ToLower()
  $response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }

  try {
    $bytes = [IO.File]::ReadAllBytes($FilePath)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    # Client closed connection early
  } finally {
    try { $response.OutputStream.Close() } catch {}
    try { $response.Close() } catch {}
  }
}

function Handle-Request {
  param($Context)

  try {
    $request = $Context.Request
    $relative = [System.Uri]::UnescapeDataString($request.Url.LocalPath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }

    $filePath = Join-Path $root ($relative -replace '/', [IO.Path]::DirectorySeparatorChar)
    $filePath = [IO.Path]::GetFullPath($filePath)
    $rootFull = [IO.Path]::GetFullPath($root)

    if (-not $filePath.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
      Send-Response -Context $Context -StatusCode 403 -Body '403 Forbidden' -ContentType 'text/plain; charset=utf-8'
      return
    }

    if (Test-Path -LiteralPath $filePath -PathType Leaf) {
      Send-File -Context $Context -FilePath $filePath
    } else {
      Send-Response -Context $Context -StatusCode 404 -Body '404 Not Found' -ContentType 'text/plain; charset=utf-8'
    }
  } catch {
    try { $Context.Response.Abort() } catch {}
  }
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    Handle-Request -Context $context
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
