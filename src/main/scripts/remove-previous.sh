# Old installer directories
rm -rf "$HOME/rvplayer/Installer"
rm -rf "$HOME/rvplayer/JRE"

# Old installer directories
find "$HOME/rvplayer" -maxdepth 1 -type d -path "$HOME/rvplayer/20*" | grep -v VERSION | xargs -d"\n" rm -rf
