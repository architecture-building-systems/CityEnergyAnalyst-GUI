FROM node:current-alpine

RUN corepack enable

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn
COPY . .

RUN yarn build
EXPOSE 4173

CMD [ "yarn", "preview", "--host" ]