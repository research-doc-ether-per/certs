sudo journalctl -b -1 -p warning --no-pager | tail -100

systemd-detect-virt

lspci -nnk | grep -A 5 -iE 'VGA|Display'
