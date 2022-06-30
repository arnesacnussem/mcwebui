# because the game server, we may not want to use alpine
FROM node:alpine as build-ui

WORKDIR /ui
COPY .yarnrc.yml .
COPY package.json .
COPY yarn.lock .
COPY .yarn ./.yarn
COPY server/package.json ./server/package.json
RUN yarn install

COPY . .
RUN yarn build

FROM node:alpine as build-server

WORKDIR /server
COPY ./server/package.json .
RUN yarn install

COPY ./server .
RUN yarn build

FROM ubuntu:focal as runtime
RUN apt update && apt install -y curl
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash
RUN apt install -y nodejs
RUN npm i -g yarn

ENV NODE_ENV=PRODUCTION
WORKDIR /mcwebui
COPY --from=build-server /server/package.json .
RUN yarn install
COPY --from=build-server /server/dist .
COPY --from=build-ui /ui/build ./dist

EXPOSE 8000
CMD node /mcwebui/app.js
