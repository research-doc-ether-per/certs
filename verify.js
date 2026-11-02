gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.session idle-delay 0

sudo dpkg --audit

sudo apt-get check

cat /etc/os-release


sudo apt update
apt list --upgradable

sudo apt upgrade

systemctl --failed


journalctl -b -1 -p err --no-pager | tail -100

