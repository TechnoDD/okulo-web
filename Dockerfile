# =============================================
# Stage 1: Builder
# =============================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copia package files
COPY package.json ./
RUN bun install

# Copia sorgente e builda (output -> dist/)
COPY . .
RUN bun run build

# =============================================
# Stage 2: Runner (Production)
# =============================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Installa curl per healthcheck
RUN apk add --no-cache curl

# Copia files corretti da TanStack Start
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Porta TanStack Start
EXPOSE 3000

# Health check (adatta al tuo health endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["bun", "run", "start"]
