# ADR-008 Autorización En Application Layer Y RLS Como Defensa Adicional

## Estado

Aprobado.

## Contexto

El sistema manejará datos personales y permisos por rol.

## Problema

Depender solo de RLS o solo de application layer deja huecos operativos.

## Opciones Consideradas

- Solo autorización en aplicación.
- Solo RLS.
- Doble capa: aplicación + RLS.

## Pros Y Contras

Solo aplicación es portable, pero un error de query puede exponer datos. Solo RLS protege DB, pero es difícil expresar todo el dominio. Doble capa reduce riesgo con más disciplina.

## Decisión

Aplicar permisos en application layer y usar RLS como defensa adicional cuando existan tablas de dominio expuestas a infraestructura Supabase.

## Consecuencias

Los casos de uso reciben actor context y validan permisos antes de ejecutar.

## Riesgos

Reglas duplicadas pueden divergir si no se prueban.

## Cuándo Reconsiderarla

Si se adopta un backend totalmente privado sin acceso directo a Supabase desde clientes, RLS podría reducirse a defensa de bajo nivel.
