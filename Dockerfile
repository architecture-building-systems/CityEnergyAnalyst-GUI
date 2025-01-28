FROM node:current-alpine

ARG VITE_CEA_URL=""
ENV VITE_CEA_URL=$VITE_CEA_URL

RUN corepack enable

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./

RUN yarn
COPY . .

RUN yarn build && rm -fr node_modules
EXPOSE 4173

CMD [ "yarn", "preview", "--host" ]