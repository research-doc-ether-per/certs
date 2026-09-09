docker cp docker-compose-wallet-api2-1:/waltid-wallet-api2/wallet2.db ./wallet2.db

sudo apt update
sudo apt install sqlite3


sqlite3 wallet2.db ".tables"


sqlite3 wallet2.db .dump > wallet2_dump.sql
