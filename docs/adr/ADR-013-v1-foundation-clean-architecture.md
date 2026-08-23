# ADR-013: Finalizacion de Fundacion V1 y Cierre de Deuda Tecnica

## Fecha
2026-08-23

## Estado
Aceptado

## Contexto
Durante el paso del *Walking Skeleton* a la version *V1 Usable*, se detecto una acumulacion significativa de deuda tecnica:
1. Las mutaciones de base de datos no tenian consistencia centralizada (algunas usaban scripts ad-hoc de pg y otras Drizzle de forma inconsistente).
2. La arquitectura permitia fugas (Next.js importando infraestructura directamente).
3. La UI presentaba componentes y menus de navegacion hardcodeados que no respetaban la seguridad del rol de usuario actual, o carecian de proteccion a nivel SSR.
4. Documentacion desactualizada e inexistencia de guias de contribucion empresarial.

## Decision
Para garantizar que Tonalá OS sea robusto para un uso en produccion:
1. **Drizzle ORM Universal**: Todas las consultas a la base de datos se hacen via \`drizzle-orm\` y \`getDatabaseClient()\`.
2. **Migraciones estandar**: Desechados los scripts SQL manuales, reemplazados por el flujo nativo de migraciones de Drizzle (snapshot 0000).
3. **Clean Architecture Estricta**: La UI de Next.js (\`apps/web\`) solo puede hablar con \`application\` y dependencias inyectadas en factorias aisladas. \`boundary-checker\` fuerza esto.
4. **Patron Outbox Estandar**: Toda operacion de mutacion clave (crear contacto, reporte de mapa, equipos) incluye una envoltura transaccional (ej: \`withOutbox\`) que emite los eventos a \`transactional_outbox\` garantizando consistencia.
5. **Roles SSG/SSR**: Reemplazo de logica en componentes cliente por guardias asincronos (\`requirePageRole\`) integrados al middleware y al Layout del App Router.

## Consecuencias
- La curva de aprendizaje del sistema sube para desarrolladores nuevos, requiriendo conocimiento explicito de Clean Architecture y Event-Driven Design.
- Se garantiza la estabilidad total de la base de datos (Tests 100% integrados).
- La documentacion tecnica pasa a un formato estandar corporativo (CONTRIBUTING, CODE_OF_CONDUCT).
