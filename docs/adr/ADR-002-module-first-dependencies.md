# ADR-002 Estructura Module-First Y Reglas De Dependencias

## Estado

Aprobado.

## Contexto

El producto se construirá por motores funcionales y bounded contexts, no por pantallas ni capas globales.

## Problema

Una estructura `domain/application/infrastructure` global oculta límites de negocio y facilita dependencias accidentales.

## Opciones Consideradas

- Carpetas globales por capa.
- Carpetas por aplicación.
- Carpetas primarias por módulo.

## Pros Y Contras

Las capas globales son familiares, pero mezclan dominios. Por aplicación duplica lógica. Module-first hace visibles los límites, aunque requiere disciplina de imports.

## Decisión

Usar `packages/modules/<module>/{domain,application,infrastructure,contracts}`.

## Consecuencias

Los módulos solo podrán importar contratos públicos de otros módulos. Infraestructura y entidades internas quedan privadas.

## Riesgos

El boundary checker actual es una primera defensa; puede necesitar herramientas más fuertes conforme crezca el código.

## Cuándo Reconsiderarla

Si aparecen módulos compartiendo demasiadas reglas, se revisará si el lenguaje de dominio está mal dividido.
