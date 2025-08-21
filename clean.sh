ip -br -4 a \
| grep -vE '^(lo|docker|br-|veth|virbr|vmnet|vboxnet|wg|tun|tap|tailscale|zt)'

