$env:ELECTRON_RUN_AS_NODE = $null
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$ErrorActionPreference = 'Stop'
$exe = Get-ChildItem -Path 'E:\Nexus-Lawyer\release-portable-exe\win-unpacked\*.exe' | Select-Object -First 1
$p = Start-Process -FilePath $exe.FullName -PassThru
Start-Sleep -Seconds 10
$p.Refresh()
"HasExited=$($p.HasExited)"
if (-not $p.HasExited) {
  "Title=$($p.MainWindowTitle)"
  "Responding=$($p.Responding)"
}
$log = Join-Path $env:APPDATA 'nexus-lawyer\settings.json'
"UserData=$log exists=$(Test-Path $log)"
if (Test-Path $log) { Get-Content $log -Raw }
if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
