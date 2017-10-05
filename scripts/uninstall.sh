#!/bin/bash
"$HOME/rvplayer/VERSION/Installer/scripts/killtasks.sh" "$@"
sleep 1
rm -f $HOME/.config/autostart/rvplayer.desktop
rm -f $HOME/.local/share/applications/rvplayer-uninstall.desktop
rm -f $HOME/.local/share/applications/rvplayer-config.desktop
rm -f $HOME/.local/share/applications/rvplayer-restart.desktop
rm -f $HOME/.local/share/applications/rvplayer-stop.desktop
rm -rf $HOME/rvplayer
rm -rf $HOME/.config/rvplayer
notify-send "Rise Vision Player uninstalled" --icon=dialog-information
