#!/bin/bash
echo "Disabling screensaver"
gsettings set org.gnome.desktop.session idle-delay 0 &>/dev/null
gsettings set org.gnome.settings-daemon.plugins.power idle-dim false &>/dev/null
gsettings set org.gnome.desktop.screensaver lock-enabled false &>/dev/null

echo "Disabling inactive timeout"
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0 &>/dev/null

