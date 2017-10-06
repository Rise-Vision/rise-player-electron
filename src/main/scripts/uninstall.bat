powershell -ExecutionPolicy ByPass -File "%LOCALAPPDATA%\rvplayer\VERSION\Installer\scripts\stop-player-gracefully.ps1"
taskkill /f /im chrome.exe
taskkill /f /im javaw.exe
taskkill /f /im installer.exe
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Rise Vision Player.lnk"
rd /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Rise Vision"
choice /C Y /N /D Y /T 3 & rd /S /Q "%LOCALAPPDATA%\rvplayer"
