sudo grep -hE '^(ExecutablePath|Signal|Date|ProblemType|Title|ErrorMessage):' /var/crash/*.crash

df -h

sudo journalctl -b -p err --no-pager | tail -80
