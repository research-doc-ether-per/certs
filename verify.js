docker ps --format '{{.ID}} {{.Names}}' \
  | awk '$2 !~ /^(kc|vc)/'


docker ps --format '{{.ID}} {{.Names}}' \
  | awk '$2 !~ /^(kc|vc)/ {print $1}' \
  | xargs -r docker rm -f
