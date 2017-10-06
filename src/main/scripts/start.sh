#!/bin/bash
notify-send "Starting Rise Vision Player" --icon=dialog-information

"$HOME/rvplayer/VERSION/Installer/scripts/killtasks.sh" "$@"

rm -rf "$HOME/.config/installer/Cache"
rm -rf "$HOME/.config/installer/Application Cache"
rm -f "$HOME/.config/installer/SingletonLock"
rm -f "$HOME/.config/installer/SingletonCookie"
rm -f "$HOME/.config/installer/SS"

rm -rf "$HOME/.config/Electron/Cache"
rm -rf "$HOME/.config/Electron/Application Cache"
rm -f "$HOME/.config/Electron/SingletonLock"
rm -f "$HOME/.config/Electron/SingletonCookie"
rm -f "$HOME/.config/Electron/SS"

"$HOME/rvplayer/VERSION/Installer/installer" "$@"
