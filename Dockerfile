FROM node:current-alpine

WORKDIR /app
COPY package.json .

RUN yarn
COPY . .

RUN yarn build
EXPOSE 4173

CMD [ "yarn", "preview" ]