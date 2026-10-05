type = "redis"

nodes = [
  {
    host = ${ISSUER_VALKEY_HOST}
    port = ${ISSUER_VALKEY_PORT}
  }
]

user = ""
password = ""
