powershell -ExecutionPolicy ByPass -File "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\toast.ps1" "Stopping Rise Player"

powershell -ExecutionPolicy ByPass -File "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\stop-player-gracefully.ps1"

call "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\killtasks.bat" %*
