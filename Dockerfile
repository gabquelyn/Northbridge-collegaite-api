FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NODE_ENV=development

RUN if [ "$NODE_ENV" = "production" ]; then npm run build; fi

EXPOSE 5000

CMD ["npm", "run", "start"]