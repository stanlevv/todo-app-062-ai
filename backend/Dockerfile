# Production Dockerfile - Backend Express.js & TypeScript
FROM node:20-alpine

WORKDIR /app

# Instal dependensi native build untuk bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["npm", "start"]
