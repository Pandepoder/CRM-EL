# 🇲🇽 Tonalá OS - Suite Integral de Gestión Territorial y Electoral

![Version](https://img.shields.io/badge/version-1.3.0--production-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.31-C5F74F.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)

**Tonalá OS** es una plataforma ERP/CRM territorial y electoral de grado institucional diseñada para la coordinación de campañas, administración de brigadas, trazabilidad en territorio, cartografía seccional (INE) y atención inmediata de incidencias ciudadanas en el Área Metropolitana de Guadalajara (AMG).

---

## 📑 Tabla de Contenidos
- [Características Principales](#-características-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación Local Rápida](#-instalación-local-rápida-3-minutos)
- [Limpieza y Preparación de Base de Datos para Producción](#-limpieza-y-preparación-de-base-de-datos-para-producción)
- [Despliegue en Producción (VPS / Hostinger / Cloud)](#-despliegue-en-producción-vps--hostinger--cloud)
- [Scripts Disponibles](#-scripts-disponibles-en-el-proyecto)
- [Arquitectura y Seguridad](#-arquitectura-y-seguridad)

---

## 🌟 Características Principales

### 1. 🗺️ Cartografía Inteligente Metropolitano (AMG) y GPS en Campo
- **Polígonos Oficiales INE:** Cobertura de secciones electorales en Tonalá (46 secciones clave), Guadalajara, Zapopan, San Pedro Tlaquepaque, Tlajomulco, El Salto y Zapotlanejo.
- **Geocodificación Inversa Automática:** Detección de calle, colonia, código postal y municipio en tiempo real con OpenStreetMap y algoritmos geoespaciales Turf.js.
- **Geolocalización GPS Móvil (`📍 Mi GPS`):** Marcador pulsante en tiempo real con zoom asistido para brigadistas operando en la calle.
- **Agrupamiento Inteligente (Clustering):** Manejo fluido de miles de marcadores territoriales con colores diferenciados por prioridad y estatus.

### 2. 🚨 Centro Integral de Administración y Despacho de Incidencias
- **4 Pestañas Operacionales:** *Pendientes por Atender*, *Emergencias Críticas*, *Historial de Resueltas* y *Todas las Incidencias* (con envío estricto de resueltas al final).
- **Herramientas Masivas:** Selección múltiple para resolver, reabrir, reasignar o purgar reportes en lote.
- **Exportación CSV & Hoja de Despacho Imprimible:** Generación de órdenes de trabajo listas para brigadas en campo.

### 3. 👥 Directorio Ciudadano y CRM
- Captura de simpatizantes con validación de CURP, clave electoral, sección y geolocalización.
- Historial de visitas territoriales, registro de compromisos y asignación a coordinadores.
- Exportación segura en formato CSV UTF-8.

### 4. 🛡️ Estructura Electoral y Brigadas
- Control de Representantes Generales (RG) y Representantes de Casilla (RC) por sección.
- Organización de cuadrillas y asignación de líderes de equipo con auditoría de movimientos.
- Trazabilidad y control de inventario/propaganda en almacenes territoriales.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend & Backend** | Next.js 15 (App Router, Server Actions, Route Handlers) + React 19 |
| **Lenguaje** | TypeScript 5.8 (Estricto con contratos compartidos) |
| **Base de Datos** | PostgreSQL 16 + Drizzle ORM |
| **Mapas & Geoespacial** | Leaflet + Turf.js + OpenStreetMap Nominatim |
| **Seguridad & Sesiones** | Argon2id + iron-session (Cifrado AES-256-GCM) |
| **Contenedores & Proxy** | Docker, Docker Compose y Caddy (HTTPS automático con Let's Encrypt) |

---

## 💻 Requisitos Previos

Asegúrate de tener instalado en tu computadora o servidor:
- **Node.js:** Versión 20.x o superior (recomendado v22 LTS o v24).
- **pnpm:** Versión 9.x, 10.x o 11.x (`corepack enable` o `npm i -g pnpm`).
- **Docker & Docker Compose:** (Para la base de datos PostgreSQL local o despliegue en servidor).
- **Git**

---

## 🚀 Instalación Local Rápida (3 minutos)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Pandepoder/CRM-EL.git
cd CRM-EL
```

### 2. Instalar Dependencias
```bash
pnpm install
```

### 3. Configurar Variables de Entorno
Copia la plantilla de configuración:
```bash
cp .env.example .env
```

Copia además el mismo archivo dentro de `apps/web/`:
```bash
cp .env apps/web/.env
```

**Las dos copias son necesarias.** Los scripts `pnpm db:*` cargan el `.env` de la
raíz con `dotenv`, pero `pnpm web:dev` ejecuta `next dev` con el directorio de
trabajo en `apps/web/`, y Next.js solo lee los archivos `.env` de esa carpeta.
Si falta la segunda copia el servidor arranca de todos modos, pero cada ruta
responde 500 y en la consola aparece `Invalid environment configuration:
DATABASE_URL: Invalid input; ...` junto con `SESSION_SECRET must be set with at
least 32 characters.`. Cuando cambies un valor, actualiza ambos archivos (los dos
están cubiertos por `.gitignore`).

> Esto solo aplica al desarrollo local. En producción `docker compose` inyecta las
> variables al contenedor `web` desde el `.env` de la raíz, así que ahí basta un
> único archivo.

### 4. Levantar Base de Datos y Sembrar Datos de Desarrollo
```bash
# Iniciar contenedor de PostgreSQL en Docker:
pnpm db:start

# Aplicar migraciones del esquema:
pnpm db:migrate

# Sembrar usuarios demo y polígonos base:
pnpm db:seed
```

### 5. Iniciar Servidor de Desarrollo
```bash
pnpm web:dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

> **Credenciales de Desarrollo (Demo):**
> - **Administrador:** `admin@tonala.gob.mx` | Contraseña: `TonalaDemo2026`
> - **Coordinador Territorial:** `coord.centro@tonala.gob.mx` | Contraseña: `TonalaDemo2026`
> - **Brigadista:** `brigada.norte@tonala.gob.mx` | Contraseña: `TonalaDemo2026`

---

## 🧹 Limpieza y Preparación de Base de Datos para Producción

Antes de lanzar el sistema en una campaña real o servidor de producción, debes vaciar todos los datos ficticios y sembrar únicamente la estructura limpia:

```bash
# Ejecuta el limpiador de producción:
pnpm db:clean
```

**¿Qué hace `pnpm db:clean`?**
1. **Borra al 100%:** Contactos de prueba, incidencias ficticias, visitas simuladas, cuadrillas temporales y logs de prueba.
2. **Carga los catálogos oficiales:** Todos los roles de seguridad, catálogo de colonias y polígonos de secciones electorales metropolitanas (INE).
3. **Crea la cuenta Administrador Maestro:** Utiliza las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidas en tu archivo `.env`.

---

## 🌐 Despliegue en Producción (VPS / Hostinger / Cloud)

El proyecto incluye soporte nativo con **Docker Compose y servidor web Caddy** para emisión automática de certificados SSL (HTTPS gratuito).

### 1. En tu Servidor Remoto (Ubuntu / Debian VPS):
```bash
# Instalar Docker si no lo tienes:
curl -fsSL https://get.docker.com | sh

# Clonar el proyecto:
git clone https://github.com/Pandepoder/CRM-EL.git
cd CRM-EL

# Crear tu archivo de entorno de producción.
# IMPORTANTE: debe llamarse exactamente ".env" — Docker Compose solo lee
# variables de un archivo con ese nombre (tanto para armar docker-compose.yml
# como para inyectarlas al contenedor "web"). Un archivo ".env.production" es
# ignorado silenciosamente y la app no arrancará.
cp .env.production.example .env
nano .env
```

### 2. Configura `.env`:
- Asigna contraseñas seguras a `POSTGRES_PASSWORD`, `SESSION_SECRET`, `DATABASE_ENCRYPTION_KEY` y `ADMIN_PASSWORD` (usa `openssl rand -base64 24` / `openssl rand -hex 16` según el caso — nunca dejes los valores de ejemplo).
- Configura `DOMAIN` con tu dominio real (Caddy lo usa para emitir el certificado HTTPS).
- Deja `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false`.

### 3. Levantar la Aplicación:
```bash
docker compose up -d --build
```
Esto levanta la base de datos, aplica las migraciones pendientes automáticamente
(servicio `migrate`, corre una sola vez antes de que arranque `web`), inicia un
worker que procesa el outbox transaccional en segundo plano (`outbox-worker`) y
finalmente arranca `web` y `caddy`. Ya no es necesario correr `db:migrate` a mano.

### 4. Limpiar la Base de Datos para Producción:
```bash
docker compose exec web pnpm db:clean
```
Este paso sigue siendo manual y a propósito: borra los datos de prueba y siembra
los catálogos oficiales + la cuenta de Administrador Maestro. Si tu base de datos
no está en `localhost`, te pedirá confirmar escribiendo el nombre de la base de
datos antes de continuar.

Tu CRM estará en línea con HTTPS seguro configurado automáticamente.

---

## 💾 Respaldos y Restauración

`docker compose up -d` levanta también el servicio `backup`, que vuelca la base
una vez al día a un `pg_dump` comprimido en el volumen `tonala_os_backups` y poda
los que superan la retención.

| Variable | Por defecto | Qué controla |
|---|---|---|
| `BACKUP_INTERVAL_SECONDS` | `86400` | Cada cuánto se hace un volcado |
| `BACKUP_RETENTION_DAYS` | `14` | Cuántos días se conservan |

Listar lo que hay respaldado:

```bash
docker compose exec backup ls -lh /backups
```

**Ensayar la restauración** en una base desechable — hazlo antes de necesitarla,
no el día que falle el disco:

```bash
docker compose exec db psql -U tonala -d postgres -c "CREATE DATABASE restore_test OWNER tonala;"
```

```bash
docker compose run --rm --entrypoint sh -e CONFIRM_RESTORE=si-borra-la-base-destino -e RESTORE_TARGET_DB=restore_test backup /usr/local/bin/restore.sh /backups/tonala_os-<TIMESTAMP>.sql.gz
```

El script verifica el gzip, restaura e imprime los conteos de `contacts`,
`user_profiles`, `colonies` y `electoral_sections` para que compares. Sin la
variable `CONFIRM_RESTORE` aborta, y `--entrypoint sh` es obligatorio: sin él
`compose run` arranca el bucle de respaldo y se queda colgado.

Para restaurar de verdad sobre la base buena, omite `RESTORE_TARGET_DB`.

> ⚠️ **Falta la copia fuera del servidor.** Estos respaldos viven en un volumen
> del mismo VPS: sirven ante un borrado accidental de datos, no ante la pérdida
> del disco o del servidor. Añade una réplica a S3, rclone o `scp` a otra máquina.

### Archivos adjuntos

Las fotos y videos de incidencias se guardan en el volumen `tonala_os_uploads`.
No están cubiertos por `pg_dump` — respáldalos aparte:

```bash
docker run --rm -v tonala_os_uploads:/data -v "$PWD":/out alpine tar czf /out/uploads.tar.gz -C /data .
```

---

## 📜 Scripts Disponibles en el Proyecto

| Comando | Descripción |
| :--- | :--- |
| `pnpm web:dev` | Inicia el servidor Next.js en modo desarrollo con Hot-Reload. |
| `pnpm build` | Compila la aplicación completa para producción y optimiza rutas. |
| `pnpm typecheck` | Valida todos los tipos TypeScript del monorepo sin compilar. |
| `pnpm db:start` | Levanta PostgreSQL en Docker en el puerto local configurado. |
| `pnpm db:stop` | Detiene el contenedor de base de datos local. |
| `pnpm db:migrate` | Ejecuta las migraciones SQL pendientes con Drizzle ORM. |
| `pnpm db:seed` | Carga datos de prueba y usuarios demo para desarrollo. |
| `pnpm db:clean` | **Limpia la base de datos para producción** (deja solo catálogos y admin maestro). |
| `pnpm db:reset` | Borra la base de datos local por completo y la reinicia desde cero. |
| `pnpm exec tsx scripts/qa-suite.ts` | Ejecuta la suite de 16 pruebas automatizadas E2E de calidad. |

---

## 🔒 Arquitectura y Seguridad

- **Cifrado de Contraseñas:** Hashes resistentes con `argon2id` (configuración recomendada por OWASP).
- **Gestión de Sesiones:** Cookies HTTP-Only firmadas y selladas mediante `iron-session` (AES-256-GCM).
- **Patrón Outbox Transaccional:** Todas las operaciones de creación de contactos y visitas territoriales quedan registradas con consistencia atómica para garantizar que no se pierdan datos en fallas de red.
- **Control de Acceso Basado en Roles (RBAC):** Middleware y Server Actions protegidos por perfiles estrictos (`admin`, `territorial_coordinator`, `capturist`, `brigadista`, `auditor`, `direction`).

---

## 📄 Licencia
Propiedad de **Tonalá OS / CRM Territorial**. Todos los derechos reservados.
