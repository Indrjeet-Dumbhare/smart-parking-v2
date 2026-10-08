FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first so Docker caches this layer
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src

USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
