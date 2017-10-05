@echo off
setlocal enableextensions disabledelayedexpansion

rem Old installer directories
rd /Q /S "%LOCALAPPDATA%\rvplayer\Installer"
rd /Q /S "%LOCALAPPDATA%\rvplayer\JRE"

rem Installed versions except current
for /d %%G in ("%LOCALAPPDATA%\rvplayer\*") do (
  set "CURR=%%G"
  set "SKIP="
  setlocal enabledelayedexpansion
  if not "!CURR:VERSION=!"=="!CURR!" set "SKIP=1"
  if "!CURR:%LOCALAPPDATA%\rvplayer\20=!"=="!CURR!" set "SKIP=1"

  if not defined SKIP (
    rd /Q /S "%%G"
  )
  endlocal
)

rem Old temporary directories
for /d %%G in ("%LOCALAPPDATA%\Temp\rvplayer*") do (
  set "CURR=%%G"
  setlocal enabledelayedexpansion
  if "!CURR:rvplayer-VERSION=!"=="!CURR!" (
    rd /Q /S "%%G"
  )
  endlocal
)
