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

# --- Help handling (must be first) ---
# Triggers on: help, -h, -help, --help
if ($args.Count -gt 0 -and $args[0] -match '^(?:help|-h|-help|--help)$') {

    $C_TITLE = 'Cyan'
    $C_HEAD  = 'Yellow'
    $C_TEXT  = 'Gray'
    $C_DIM   = 'DarkGray'
    $C_OK    = 'Green'
    $C_WARN  = 'Magenta'

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor $C_TITLE
    Write-Host "                 UDB Source Port Launcher                    " -ForegroundColor $C_TITLE
    Write-Host "============================================================" -ForegroundColor $C_TITLE
    Write-Host ""

    Write-Host "SETUP" -ForegroundColor $C_HEAD
    Write-Host "  Edit : UDB-DoomLauncher.ps1 to set source port paths, nicknames, and the default port." -ForegroundColor $C_TEXT
    Write-Host "  Add  : UDB-DoomLauncher.bat as the testing engine in UDB." -ForegroundColor $C_TEXT
    Write-Host "  Add  : .\build\textures.wad as a resource during Map Setup in UDB." -ForegroundColor $C_TEXT
    Write-Host ""

    Write-Host "NOTES" -ForegroundColor $C_HEAD
    Write-Host "  * DoomTools project must have had doomtools-tweak applied during project setup." -ForegroundColor $C_TEXT
    Write-Host "  * On Doom Launch : script overwrites textures.wad with textures-All.wad." -ForegroundColor $C_TEXT
    Write-Host "  * On Doom Exit   : script overwrites textures.wad with textures-Restricted.wad." -ForegroundColor $C_TEXT
    Write-Host "  * This allows editing in UDB with restricted textures AND playtesting from inside UDB." -ForegroundColor $C_OK
    Write-Host "  * Put the port nickname as the first argument to change source port." -ForegroundColor $C_TEXT
    Write-Host "  * All other dash-arguments are passed through unchanged." -ForegroundColor $C_TEXT
    Write-Host ""

    Write-Host "Press any key to close..." -ForegroundColor $C_DIM
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
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