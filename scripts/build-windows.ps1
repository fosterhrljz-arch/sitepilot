param([switch]$SkipBuild, [switch]$SkipLauncherBuild)
$ErrorActionPreference = 'Stop'
$pilotRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $pilotRoot
try {
    $pilotVersion = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
    if ($pilotVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version.' }
    $pilotRelease = [System.IO.Path]::GetFullPath((Join-Path $pilotRoot ('releases\SitePilot-' + $pilotVersion + '-windows-x64')))
    $pilotSource = [System.IO.Path]::GetFullPath((Join-Path $pilotRoot ('releases\SitePilot-' + $pilotVersion + '-source')))
    foreach ($pilotTarget in @($pilotRelease,$pilotSource)) {
        if (-not $pilotTarget.StartsWith($pilotRoot + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Release target is outside the project.' }
        if ((Test-Path -LiteralPath $pilotTarget) -or (Test-Path -LiteralPath ($pilotTarget + '.zip'))) { throw 'Release already exists. Use a clean source extraction or a new version; existing releases are never overwritten.' }
    }
    if (-not $SkipBuild) { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' } }
    & node.exe scripts/licenses.mjs
    if ($LASTEXITCODE -ne 0) { throw 'License collection failed.' }
    $pilotCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    if (-not $SkipLauncherBuild) {
        & $pilotCompiler /nologo /target:winexe /platform:anycpu /win32icon:app.ico /out:SitePilot.exe /reference:System.Windows.Forms.dll /reference:System.Drawing.dll '.\launcher\SitePilot.cs'
        if ($LASTEXITCODE -ne 0) { throw 'Launcher compilation failed.' }
    }
    if (-not (Test-Path -LiteralPath 'runtime')) { New-Item -ItemType Directory -Path 'runtime' | Out-Null }
    if (-not (Test-Path -LiteralPath 'runtime/node.exe')) { Copy-Item -LiteralPath (Get-Command node.exe).Source -Destination 'runtime/node.exe' }
    foreach ($pilotRequired in @('runtime/LICENSE-node.txt','dist/index.html','Getting Started.html','open-services.mjs','src/core/profiles.mjs')) { if (-not (Test-Path -LiteralPath $pilotRequired)) { throw ('Missing release file: ' + $pilotRequired) } }
    New-Item -ItemType Directory -Path $pilotRelease,$pilotSource | Out-Null
    $pilotSourceItems = @('app.ico','server.mjs','open-services.mjs','Getting Started.html','README.md','CHANGELOG.md','THIRD-PARTY-NOTICES.txt','package.json','package-lock.json','index.html','vite.config.js','playwright.config.js','src','public','launcher','scripts','tests','docs')
    foreach ($pilotItem in $pilotSourceItems) {
        Copy-Item -LiteralPath (Join-Path $pilotRoot $pilotItem) -Destination $pilotRelease -Recurse
        Copy-Item -LiteralPath (Join-Path $pilotRoot $pilotItem) -Destination $pilotSource -Recurse
    }
    foreach ($pilotItem in @('SitePilot.exe','dist','runtime')) { Copy-Item -LiteralPath (Join-Path $pilotRoot $pilotItem) -Destination $pilotRelease -Recurse }
    New-Item -ItemType Directory -Path (Join-Path $pilotSource 'runtime') | Out-Null
    Copy-Item -LiteralPath 'runtime/LICENSE-node.txt' -Destination (Join-Path $pilotSource 'runtime')
    foreach ($pilotTarget in @($pilotRelease,$pilotSource)) {
        $pilotZip = $pilotTarget + '.zip'
        Compress-Archive -LiteralPath $pilotTarget -DestinationPath $pilotZip -CompressionLevel Optimal
        $pilotHash = (Get-FileHash -LiteralPath $pilotZip -Algorithm SHA256).Hash.ToLower()
        ($pilotHash + '  ' + [System.IO.Path]::GetFileName($pilotZip)) | Set-Content -LiteralPath ($pilotZip + '.sha256') -Encoding ascii
        Write-Host ('Created: ' + $pilotZip)
    }
} finally { Pop-Location }
