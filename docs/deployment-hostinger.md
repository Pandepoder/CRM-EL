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
   - `DATABASE_URL=postgres://tonala:tonala_dev_password@db:5432/tonala_os`
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

## Migraciones de Base de Datos

Después de levantar la base de datos por primera vez, deberás ejecutar las migraciones:
```bash
# Entrar al contenedor
docker compose exec web sh
# Si no está en el contenedor, correr migraciones desde tu máquina local (haciendo un port-forward a la DB) o incluyendo un paso en el compose.
```
*Nota: Si se usa un script local para migrar la BD en Docker, asegúrate de apuntar a `localhost:54329`.*
