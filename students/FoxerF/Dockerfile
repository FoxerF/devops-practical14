FROM node:26-alpine

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/app/data/sessions.json

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node src ./src

RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]