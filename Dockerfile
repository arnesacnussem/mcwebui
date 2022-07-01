# because the game server, we may not want to use alpine
FROM node:alpine as build

WORKDIR /workdir
COPY .yarnrc.yml .
COPY package.json .
COPY yarn.lock .
COPY .yarn ./.yarn
COPY server/package.json ./server/package.json
RUN yarn install

COPY server ./server
RUN yarn workspace webui-server build

COPY . .
RUN yarn build

FROM ubuntu:focal as runtime
RUN apt update && apt install -y curl
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash
RUN apt install -y nodejs
RUN npm i -g yarn

# setup filebrowser
RUN curl -fsSL https://raw.githubusercontent.com/filebrowser/get/master/get.sh | bash

ENV NODE_ENV=PRODUCTION
WORKDIR /webui
COPY --from=build /workdir/server/package.json .
RUN yarn install
COPY --from=build /workdir/server/dist .
COPY --from=build /workdir/build ./dist

EXPOSE 8000
CMD node app.js
