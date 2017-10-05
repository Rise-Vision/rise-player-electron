powershell -ExecutionPolicy ByPass -File "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\toast.ps1" "Starting Rise Player"

powershell -ExecutionPolicy ByPass -File "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\stop-player-gracefully.ps1"

call "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\killtasks.bat" %*

rd /S /Q "%APPDATA%\installer\Cache"
rd /S /Q "%APPDATA%\installer\Application Cache"
del /F /Q "%APPDATA%\installer\SingletonLock"
del /F /Q "%APPDATA%\installer\SingletonCookie"
del /F /Q "%APPDATA%\installer\SS"

rd /S /Q "%APPDATA%\Electron\Cache"
rd /S /Q "%APPDATA%\Electron\Application Cache"
del /F /Q "%APPDATA%\Electron\SingletonLock"
del /F /Q "%APPDATA%\Electron\SingletonCookie"
del /F /Q "%APPDATA%\Electron\SS"

"%LOCALAPPDATA%\rvplayer\VERSION\Installer\installer.exe" %*
