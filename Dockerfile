# =============================================
# Stage 1: Builder
# =============================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Installa dipendenze
COPY package.json ./
RUN bun install

# Copia tutto e builda
COPY . .
RUN bun run build

# =============================================
# Stage 2: Runner (Production)
# =============================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Copia il server handler da .output
COPY --from=builder /app/.output ./output
COPY --from=builder /app/package.json ./package.json

# Installa solo production deps
RUN bun install --production

EXPOSE 3000

CMD ["bun", "./server/index.mjs"]
