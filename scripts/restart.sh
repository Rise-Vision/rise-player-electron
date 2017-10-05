#!/bin/bash
notify-send "Restarting Rise Vision Player" --icon=dialog-information

"$HOME/rvplayer/VERSION/Installer/scripts/killtasks.sh" "$@"

"$HOME/rvplayer/VERSION/Installer/installer" "$@"
