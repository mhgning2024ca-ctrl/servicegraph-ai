FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile   && pnpm --filter @servicegraph/contracts build   && pnpm --filter @servicegraph/api build

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
EXPOSE 3001

CMD ["node", "apps/api/dist/src/server.js"]
