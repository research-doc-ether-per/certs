did-web-server:
    image: nginx:alpine
    container_name: did-web-server
    ports:
      - "5101:80"
    volumes:
      - ${HOME}/workspace/cloudcredentialservice/samples/v0.21.0/output/issuerDids:/usr/share/nginx/html/dids:ro
