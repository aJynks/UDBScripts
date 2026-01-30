# ===== DEFAULT SOURCE PORT =====
$defaultPort = "nyan"

# ===== SOURCE PORT LIST =====
$sourcePort_exes = @{
  "cherry" = "d:\Applications\Games\Doom\_SourcePort\Cherry-Doom\cherry-doom.exe"
  "choco"  = "d:\Applications\Games\Doom\_SourcePort\Chocolate-Doom\chocolate-doom.exe"
  "crispy" = "d:\Applications\Games\Doom\_SourcePort\Crispy-Doom\crispy-doom.exe"
  "dsda"   = "d:\Applications\Games\Doom\_SourcePort\dsda-Doom\dsda-doom.exe"
  "edge"   = ""
  "helion" = "d:\Applications\Games\Doom\_SourcePort\helion-Doom\Helion.exe"
  "kex"    = "d:\Applications\Games\Doom\_SourcePort\Kex-Doom\DOOM + DOOM II\doom_gog.exe"
  "nugget" = "d:\Applications\Games\Doom\_SourcePort\nugget-Doom\nugget-doom.exe"
  "nyan"   = "d:\Applications\Games\Doom\_SourcePort\Nyan-Doom\nyan-doom.exe"
  "retro"  = "d:\Applications\Games\Doom\_SourcePort\Reto-Doom\doomretro.exe"
  "uz"     = "d:\Applications\Games\Doom\_SourcePort\uzDoom\uzdoom.exe"
  "woof"   = "d:\Applications\Games\Doom\_SourcePort\woof-Doom\woof.exe"
}

# ===== EXTRACT BUILD DIRECTORY FROM ARGS =====
$buildDir = $null
$argsString = $args -join ' '

if ($argsString -match '([A-Z]:[^:]+\\build)\\[^\\]+\.wad') {
  $buildDir = $matches[1]
} else {
  $buildDir = ".\build"
}

# ===== EXTRACT PORT OVERRIDE AND CLEAN ARGS =====
$port = $defaultPort  # Initialize with default
$cleanArgs = @()

for ($i = 0; $i -lt $args.Count; $i++) {
  $arg = $args[$i]
  
  # Check if this argument is a known port name
  if ($sourcePort_exes.ContainsKey($arg)) {
    $port = $arg
    # Skip this argument, don't add to cleanArgs
  } else {
    # Quote arguments that contain spaces
    if ($arg -match '\s' -and $arg -notmatch '^".*"$') {
      $cleanArgs += "`"$arg`""
    } else {
      $cleanArgs += $arg
    }
  }
}

# ===== ADD KEX-SPECIFIC ARGS =====
if ($port -eq "kex") {
  $cleanArgs += "-skipmovies"
}

# ===== VALIDATE =====
if (-not $sourcePort_exes.ContainsKey($port)) {
  exit 1
}

$exe = $sourcePort_exes[$port]
if ($exe -eq "" -or -not (Test-Path -LiteralPath $exe)) {
  exit 1
}


# ===== COPY BEFORE LAUNCH =====
$texAllPath = Join-Path $buildDir "textures-All.wad"
$texDestPath = Join-Path $buildDir "textures.wad"

if (Test-Path -LiteralPath $texAllPath) {
  Copy-Item -LiteralPath $texAllPath -Destination $texDestPath -Force -ErrorAction SilentlyContinue
}

# ===== LAUNCH PORT WITH UDB ARGS =====
Start-Process -FilePath $exe -ArgumentList $cleanArgs -Wait -NoNewWindow

# ===== COPY AFTER EXIT =====
$texRestrictedPath = Join-Path $buildDir "textures-Restricted.wad"

if (Test-Path -LiteralPath $texRestrictedPath) {
  Copy-Item -LiteralPath $texRestrictedPath -Destination $texDestPath -Force -ErrorAction SilentlyContinue
}