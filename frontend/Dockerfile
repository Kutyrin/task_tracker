FROM node:24-bookworm-slim AS base

WORKDIR /app

FROM base AS deps

COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY public ./public
COPY src ./src

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM base AS prod-deps

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/next.config.ts ./

USER node

EXPOSE 3000

CMD ["npm", "start"]
