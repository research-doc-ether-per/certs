sudo swapoff -a
sudo rm -f /swapfile

sudo fallocate -l 12G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

sudo apt update
sudo apt install -y virtualbox-guest-x11 virtualbox-guest-utils
sudo reboot

sudo apt install -y dkms build-essential linux-headers-$(uname -r)

cd /media/$USER/VBox_GAs_*
sudo ./VBoxLinuxAdditions.run
sudo reboot

lsmod | grep vbox


