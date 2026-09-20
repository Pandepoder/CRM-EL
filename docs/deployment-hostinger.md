# Guía de Despliegue en Hostinger VPS (Docker)

Esta guía describe cómo desplegar Tonalá OS en un VPS de Hostinger utilizando Docker Compose y Caddy para proxy inverso automático con HTTPS.

## Requisitos Previos

1. Un VPS de Hostinger con Ubuntu 22.04 (o similar).
2. Un dominio apuntando a la IP pública del VPS (A record).
3. Docker y Docker Compose instalados en el servidor.

## Pasos de Instalación

1. **Clonar el Repositorio**
   ```bash
   git clone <url-del-repositorio> tonala-os
   cd tonala-os
   ```

2. **Configurar Variables de Entorno**
   ```bash
   cp .env.example .env
   # Edita el .env según corresponda
   ```
   Asegúrate de configurar en el entorno (o en `.env` en la misma carpeta):
   - `DOMAIN=tudominio.com` (Para que Caddy genere los certificados SSL)
   - `DATABASE_URL=postgres://tonala:LA_MISMA_DE_ARRIBA@db:5432/tonala_os`
   - `ALLOW_PUBLIC_REGISTRATION=true`
   - Claves de autenticación como `SESSION_SECRET`

3. **Levantar los Servicios**
   ```bash
   docker compose up -d --build
   ```

## Arquitectura del Despliegue

- **db**: PostgreSQL 16
- **web**: Next.js Standalone, que incluye la API y el cliente web en un solo contenedor, construido vía un multistage `Dockerfile`.
- **caddy**: Caddy Server actúa como proxy inverso en el puerto 80/443. Si el dominio está configurado correctamente en la variable `$DOMAIN`, solicitará los certificados de Let's Encrypt automáticamente.

## Monitoreo

- Logs del servidor web: `docker compose logs -f web`
- Logs de Caddy (para verificar SSL): `docker compose logs -f caddy`
- Endpoint de Healthcheck: `https://tudominio.com/api/health`

## Base de datos: primera vez

`docker compose up` aplica las migraciones solo (servicio `migrate`), y eso **no basta para una
base nueva**: las migraciones crean las tablas pero no insertan ninguna fila, así que quedan cero
roles y nadie puede ni registrarse. La primera vez hay que correr el arranque completo:

```bash
docker compose run --rm -e ADMIN_EMAIL="tu@correo" -e ADMIN_PASSWORD="la-que-elijas" migrate pnpm db:bootstrap
```

Eso deja: los 5 roles, el catálogo de colonias, los 3,787 contornos oficiales del INE y la cuenta
de administración. Si además quieres las prioridades y votos por sección, copia el atlas de la
campaña al servidor y móntalo:

```bash
docker compose run --rm -v "$PWD/atlas-distrito-10.json:/app/scripts/local/atlas-distrito-10.json:ro" migrate pnpm db:load-atlas
```

Sobre una base que ya está en uso, `db:bootstrap` se detiene después de migrar y no borra nada,
así que es seguro repetirlo en cada despliegue.

### Si el mapa muestra cuadrados sobre las secciones reales

```bash
docker compose run --rm migrate pnpm db:restore-geo
docker compose run --rm -e CONFIRMAR_LIMPIEZA=si migrate pnpm db:clean-sections
```
