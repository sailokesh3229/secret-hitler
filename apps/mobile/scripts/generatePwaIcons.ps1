$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$themeSource = Get-Content (Join-Path $projectRoot 'packages/theme/src/colors.ts') -Raw
$publicDir = Join-Path $PSScriptRoot '../public'
New-Item -ItemType Directory -Force -Path $publicDir | Out-Null

function Get-ThemeColor([string] $token) {
  $match = [regex]::Match($themeSource, '\b' + [regex]::Escape($token) + ':\s*"(#[0-9A-Fa-f]{6})"')
  if (-not $match.Success) { throw "Missing colour token: $token" }
  return [System.Drawing.ColorTranslator]::FromHtml($match.Groups[1].Value)
}

$background = Get-ThemeColor 'background'
$surface = Get-ThemeColor 'surfaceRecessed'
$accent = Get-ThemeColor 'accent'
$paper = Get-ThemeColor 'paper'

foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.Clear($background)
  $surfaceBrush = [System.Drawing.SolidBrush]::new($surface)
  $accentBrush = [System.Drawing.SolidBrush]::new($accent)
  $inkBrush = [System.Drawing.SolidBrush]::new($background)
  $outerPen = [System.Drawing.Pen]::new($accent, [float]($size * 0.016))
  $innerPen = [System.Drawing.Pen]::new($paper, [float]($size * 0.006))
  $graphics.FillEllipse($surfaceBrush, [float]($size * 0.08), [float]($size * 0.08), [float]($size * 0.84), [float]($size * 0.84))
  $graphics.DrawEllipse($outerPen, [float]($size * 0.08), [float]($size * 0.08), [float]($size * 0.84), [float]($size * 0.84))
  $graphics.DrawEllipse($innerPen, [float]($size * 0.16), [float]($size * 0.16), [float]($size * 0.68), [float]($size * 0.68))
  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($size * 0.5, $size * 0.20),
    [System.Drawing.PointF]::new($size * 0.55, $size * 0.45),
    [System.Drawing.PointF]::new($size * 0.80, $size * 0.50),
    [System.Drawing.PointF]::new($size * 0.55, $size * 0.55),
    [System.Drawing.PointF]::new($size * 0.50, $size * 0.80),
    [System.Drawing.PointF]::new($size * 0.45, $size * 0.55),
    [System.Drawing.PointF]::new($size * 0.20, $size * 0.50),
    [System.Drawing.PointF]::new($size * 0.45, $size * 0.45)
  )
  $graphics.FillPolygon($accentBrush, $points)
  $graphics.FillEllipse($inkBrush, [float]($size * 0.46), [float]($size * 0.46), [float]($size * 0.08), [float]($size * 0.08))
  $bitmap.Save((Join-Path $publicDir "logo$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  $surfaceBrush.Dispose()
  $accentBrush.Dispose()
  $inkBrush.Dispose()
  $outerPen.Dispose()
  $innerPen.Dispose()
}
