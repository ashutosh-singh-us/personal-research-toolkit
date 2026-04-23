FROM node:20-slim

WORKDIR /app

COPY package.json server.js ./
COPY node_modules ./node_modules/

EXPOSE 4000

CMD ["node", "server.js"]
