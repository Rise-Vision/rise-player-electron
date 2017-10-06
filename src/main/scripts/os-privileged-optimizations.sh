#!/bin/bash
echo "Disabling system update notifications"
sudo cp /usr/bin/update-notifier /usr/bin/update-notifier.real &>/dev/null
echo '#!/bin/sh' |sudo tee /usr/bin/update-notifier &>/dev/null
echo 'exit 0' |sudo tee -a /usr/bin/update-notifier &>/dev/null

echo "Disabling apport"
echo ' # ' |sudo tee -a /etc/default/apport &>/dev/null
echo 'enabled=0' |sudo tee -a /etc/default/apport &>/dev/null

echo "Removing legacy Rise Vision cron setting"
sudo sed -i.bak '/rvplayer/d' /etc/crontab &>/dev/null

echo "Disabling overscan"
uname -m |grep armv7 &>/dev/null && sudo bash -c "echo 'disable_overscan=1' >>/boot/config.txt" &>/dev/null

#disable screensaver on pi
uname -m |grep armv7 &>/dev/null && sudo bash -c "sed -i -e 's/#xserver-command=X/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf" &>/dev/null

sudo apt-get -y install ttf-mscorefonts-installer 2>/dev/null
