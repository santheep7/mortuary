# Multi-stage build: stage 1 builds the client, stage 2 runs the server
# with the built client sitting alongside it. One image, one thing to
# deploy - matches server.js serving both from one process.
#
# Base is node:20-slim (Debian/glibc), not node:20-alpine (musl) - bcrypt's
# prebuilt binaries target glibc, so alpine would need a full compiler
# toolchain just to install it. Slim avoids that for a small size cost.

FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
