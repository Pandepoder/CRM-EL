FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache python3 make g++

FROM base AS builder
WORKDIR /app

# Next.js sustituye las NEXT_PUBLIC_* por su valor al compilar, y solo puede
# eliminar el bloque de acceso demo si la variable tiene un valor definido en ese
# momento: si no esta definida, la condicion no es constante, el minificador no
# puede plegarla y el bloque entero viaja al navegador.
#
# Aqui no llegaba ninguna. .dockerignore excluye .env a proposito, y el env_file
# de docker-compose solo aplica al contenedor en ejecucion, no a esta etapa de
# construccion. Sin estos ARG el build dejaba siempre la demo dentro de la imagen,
# justo lo contrario de lo que sugeria excluir el .env.
ARG NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false
ARG NEXT_PUBLIC_DEMO_PASSWORD=
ENV NEXT_PUBLIC_ENABLE_DEMO_LOGIN=$NEXT_PUBLIC_ENABLE_DEMO_LOGIN
ENV NEXT_PUBLIC_DEMO_PASSWORD=$NEXT_PUBLIC_DEMO_PASSWORD

COPY . .
RUN mkdir -p apps/web/public
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tonala/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/db ./db
# Solo los scripts que el contenedor ejecuta de verdad: las migraciones y tareas
# de base (servicio `migrate`, `docker compose exec web pnpm db:clean`), el worker
# de outbox y el motor de proyeccion que ese worker y apps/web/src/lib/outbox.ts
# importan. Antes se copiaba scripts/ entero (~48 MiB), lo que metia en la imagen
# de produccion las utilidades de VPS: despliegue, inspeccion y acceso SSH.
COPY --from=builder /app/scripts/db ./scripts/db
COPY --from=builder /app/scripts/outbox ./scripts/outbox
COPY --from=builder /app/scripts/composition ./scripts/composition
COPY --from=builder /app/packages ./packages
RUN mkdir -p apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
