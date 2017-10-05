powershell -ExecutionPolicy ByPass -File "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\toast.ps1" "Restarting Rise Player"

call "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\killtasks.bat" %*

"%LOCALAPPDATA%\rvplayer\VERSION\Installer\installer.exe" %*
