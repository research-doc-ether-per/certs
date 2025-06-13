COPY certs/server.crt /usr/local/share/ca-certificates/did-web.crt  
RUN update-ca-certificates  
