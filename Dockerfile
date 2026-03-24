FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG NODE_ENV=production

RUN if [ "$NODE_ENV" = "production" ]; then npm run build; fi

EXPOSE 5000

CMD ["npm", "run", "start"]