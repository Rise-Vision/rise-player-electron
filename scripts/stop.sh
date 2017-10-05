#!/bin/bash
notify-send "Stopping Rise Vision Player" --icon=dialog-information

"$HOME/rvplayer/VERSION/Installer/scripts/killtasks.sh" "$@"
