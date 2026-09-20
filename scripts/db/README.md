# Database scripts

Canonical schema changes live in `db/migrations/*.sql` and are applied by:

```bash
pnpm db:migrate
```

Do not use one-off alter scripts for environments that track `schema_migrations`.
Ad-hoc helpers under `scripts/db/` are for local repair only.

## Levantar una base nueva

`pnpm db:migrate` crea las 34 tablas pero **no inserta una sola fila**: quedan cero roles, y como
`user_profiles.role_id` es obligatorio, en esa base nadie puede registrarse ni entrar. La
cartografía tampoco viene en las migraciones, así que el mapa abre en blanco.

Los cuatro pasos, en orden, están en un solo comando:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm db:bootstrap
```

1. `db:migrate` — el esquema.
2. `db:clean` — roles, colonias, secciones del AMG con sus colonias y la cuenta de administración.
3. `db:load-jalisco` — los 3,787 contornos oficiales del INE.
4. `db:load-atlas` — prioridades y votos por sección. Es opcional y se salta solo si no está el
   archivo: el atlas no viaja en el repositorio (es público) y se espera en
   `scripts/local/atlas-distrito-10.json`, o donde apunte `ATLAS_ARCHIVO`.

Sobre una base que ya tiene usuarios, `db:bootstrap` se detiene después de migrar: así el mismo
comando sirve para desplegar sobre una base en uso sin borrar a nadie. Para rehacer una a
propósito: `FORZAR=si pnpm db:bootstrap`.

Comprobado en una base vacía: 5 roles, 3,787 secciones con contorno, 215 colonias, 163 fichas de
atlas y una cuenta de administración.

## Si el mapa muestra cuadrados

Son secciones con geometría inventada por generadores antiguos. Se arreglan con:

```bash
pnpm db:restore-geo                       # devuelve su contorno del INE a las que sí existen
CONFIRMAR_LIMPIEZA=si pnpm db:clean-sections   # quita el contorno inventado a las que no
```
