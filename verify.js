
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing'
gsettings get org.gnome.desktop.screensaver lock-enabled
gsettings get org.gnome.desktop.session idle-delay
gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type
