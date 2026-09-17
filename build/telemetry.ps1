param(
    [string]$ApiKey,
    [string]$PostHogHost,
    [string]$EventName,
    [string]$GuiVersion,
    [string]$InstallSource,
    [string]$Stage,
    [string]$ErrorCode
)

# Fire-and-forget anonymous installer telemetry. This must never affect the
# installer's outcome: any failure here (bad network, blocked endpoint,
# timeout) is swallowed, and the exit code is always 0. Mirrors the outer
# CityEnergyAnalyst installer's setup/telemetry.ps1.
try {
    $distinctId = [guid]::NewGuid().ToString()

    $properties = @{
        gui_version                = $GuiVersion
        os                         = "windows"
        arch                       = $env:PROCESSOR_ARCHITECTURE
        install_source             = $InstallSource
        '$process_person_profile' = $false
    }

    if ($Stage)     { $properties.stage      = $Stage }
    if ($ErrorCode) { $properties.error_code = $ErrorCode }

    $body = @{
        api_key     = $ApiKey
        event       = $EventName
        distinct_id = $distinctId
        properties  = $properties
    } | ConvertTo-Json -Depth 6 -Compress

    Invoke-RestMethod -Uri $PostHogHost -Method Post -Body $body -ContentType "application/json" -TimeoutSec 3 | Out-Null
}
catch {
    # Intentionally ignored - see comment above.
}

# Best-effort tidy-up of the $TEMP copy the installer left behind. Not required
# for correctness (the installer overwrites it on the next run) and must never
# affect the exit code, so failures here are swallowed too.
try {
    Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
}
catch {
}

exit 0
