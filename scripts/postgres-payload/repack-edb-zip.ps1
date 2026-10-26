# Repacks an EDB "binaries" zip (Windows or macOS) into the portable payload Cove downloads.
#
# Only bin/, lib/ and share/ are kept: the zip also carries pgAdmin, StackBuilder, docs and debug
# symbols that Cove never uses, and together they are most of its size. The layout matches what
# PostgresManagerService expects under <cove home>/pgsql.
param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [string]$PgVersion,

    [Parameter(Mandatory = $true)]
    [string]$Rid,

    [Parameter(Mandatory = $true)]
    [string]$OutputDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Sha256Hex {
    param([string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try {
            $hashBytes = $sha256.ComputeHash($stream)
        }
        finally {
            $sha256.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }

    return ([System.BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()
}

# Windows PowerShell aliases curl and tar to cmdlets; the .exe suffix reaches the real tools.
$isWindowsHost = $env:OS -eq "Windows_NT"
$curl = if ($isWindowsHost) { "curl.exe" } else { "curl" }
$tar = if ($isWindowsHost) { "tar.exe" } else { "tar" }

$resolvedOutputDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir)
New-Item -ItemType Directory -Path $resolvedOutputDir -Force | Out-Null
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("cove-postgres-payload-" + [Guid]::NewGuid().ToString("N"))
$extractRoot = Join-Path $tempRoot "extract"
$payloadRoot = Join-Path $tempRoot "payload"
New-Item -ItemType Directory -Path $extractRoot, $payloadRoot -Force | Out-Null

try {
    $zipPath = Join-Path $tempRoot "postgresql.zip"
    Write-Host "Downloading $Url"
    # EDB's redirector rejects requests without a User-Agent.
    & $curl -L --fail --silent --show-error -A "Cove-Payload-Build/1.0" -o $zipPath $Url
    if ($LASTEXITCODE -ne 0) { throw "curl failed with exit code $LASTEXITCODE" }

    # bsdtar (tar on Windows and macOS) reads zip archives and keeps the dylib symlinks that
    # Expand-Archive would turn into copies.
    & $tar -xf $zipPath -C $extractRoot
    if ($LASTEXITCODE -ne 0) { throw "tar failed to extract $zipPath with exit code $LASTEXITCODE" }

    $pgCtl = Get-ChildItem -Path $extractRoot -Recurse -File | Where-Object { $_.Name -in @("pg_ctl", "pg_ctl.exe") } | Select-Object -First 1
    if ($null -eq $pgCtl) { throw "pg_ctl was not found in $Url" }
    $sourceRoot = Split-Path -Parent $pgCtl.DirectoryName

    # The macOS tools find their dylibs through the same variable Cove sets when it runs them.
    $env:DYLD_LIBRARY_PATH = Join-Path $sourceRoot "lib"
    $versionOutput = & $pgCtl.FullName --version
    if ($versionOutput -notmatch "PostgreSQL\)? $([regex]::Escape($PgVersion))(\s|$)") {
        throw "The archive contains '$versionOutput'; this payload was requested as $PgVersion."
    }

    foreach ($dir in @("bin", "lib", "share")) {
        $source = Join-Path $sourceRoot $dir
        if (-not (Test-Path $source)) { throw "The archive has no $dir directory under $sourceRoot" }
        # cp -a / robocopy keep symlinks; Copy-Item follows them on macOS.
        if ($isWindowsHost) {
            & robocopy $source (Join-Path $payloadRoot $dir) /E /NFL /NDL /NJH /NJS /NP | Out-Null
            if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
        }
        else {
            & cp -a $source (Join-Path $payloadRoot $dir)
            if ($LASTEXITCODE -ne 0) { throw "cp failed with exit code $LASTEXITCODE" }
        }
    }

    $archiveName = "postgres-$PgVersion-$Rid.tar.gz"
    $archivePath = Join-Path $resolvedOutputDir $archiveName
    if (Test-Path $archivePath) { Remove-Item -Path $archivePath -Force }
    & $tar -czf $archivePath -C $payloadRoot .
    if ($LASTEXITCODE -ne 0) { throw "tar failed to create $archivePath with exit code $LASTEXITCODE" }

    $sha256 = Get-Sha256Hex -Path $archivePath
    Set-Content -Path "$archivePath.sha256" -Value "$sha256  $archiveName" -Encoding ASCII
    Write-Host "Created $archivePath ($([math]::Round((Get-Item $archivePath).Length / 1MB)) MB) from '$versionOutput'"
}
finally {
    if (Test-Path $tempRoot) {
        Remove-Item -Path $tempRoot -Recurse -Force
    }
}
