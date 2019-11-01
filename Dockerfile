FROM node:latest
COPY ["./package*.json", "/tmp/"]
RUN cd /tmp && npm install && npm audit fix
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app
COPY [".", "/usr/src/app" ]
WORKDIR /usr/src/app
EXPOSE 8181
CMD ["npm", "run", "prod"]