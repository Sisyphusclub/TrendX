param(
  [string]$TaskName = "TrendXSignalCycle",
  [string]$StartTime = "00:01"
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runnerPath = Join-Path $projectRoot "scripts\\run-signal-cycle.ps1"
$escapedRunnerPath = $runnerPath.Replace('"', '\"')
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$escapedRunnerPath`""

schtasks /Create /SC HOURLY /MO 1 /TN $TaskName /TR $taskCommand /ST $StartTime /F
