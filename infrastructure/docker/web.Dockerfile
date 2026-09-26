FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile   && pnpm --filter @servicegraph/contracts build   && pnpm --filter @servicegraph/web build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "--filter", "@servicegraph/web", "start"]
