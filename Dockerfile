FROM node:current-alpine

RUN corepack enable

WORKDIR /app
COPY package.json .

RUN yarn
COPY . .

RUN yarn build
EXPOSE 4173

CMD [ "yarn", "preview", "--host" ]