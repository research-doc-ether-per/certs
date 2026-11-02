lspci -nnk | grep -A 4 -iE 'VGA|Display'

echo $XDG_SESSION_TYPE

sudo journalctl -b -k --no-pager | grep -iE 'vmwgfx|vboxvideo|drm.*error' | tail -50

systemctl status gdm3 --no-pager

loginctl list-sessions
