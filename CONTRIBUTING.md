# Guia de Contribucion para Tonala OS

�Gracias por tu interes en contribuir a Tonala OS! Este documento detalla nuestros procesos, estandares de codificacion y el flujo de trabajo que utilizamos para mantener una base de codigo limpia, modular y de grado empresarial.

## 1. Reglas de Arquitectura (Obligatorio)

Tonala OS utiliza un patron **Modular Monolith** basado en **Clean Architecture**. Si vas a agregar funcionalidades, debes respetar estas fronteras:

*   **Module-first:** Todo el codigo de negocio vive en `packages/modules/<nombre-modulo>`.
*   **Aislamiento Estricto:** Un modulo **JAMAS** debe importar archivos de las carpetas `domain/`, `application/` o `infrastructure/` de otro modulo.
*   **Contratos Publicos:** Si un modulo necesita hablar con otro, debe hacerlo exclusivamente importando desde la carpeta `contracts/` de dicho modulo.
*   **Event-Driven:** Las escrituras que afecten a mas de un modulo deben utilizar el patron `Outbox` para emitir eventos de dominio de forma segura.
*   **Capa de Entrega (Next.js):** La carpeta `apps/web` es puramente la capa visual y de infraestructura web. **Prohibido** poner logica de negocio compleja ahi. `apps/web` solo llama a los casos de uso (Application).
*   **Cero Tailwind:** Tonala OS utiliza reglas de CSS nativo. Modifica y amplia `globals.css` y las hojas de estilo modulares, evita inyectar utilidades atomicas de terceros.

> Nuestro pipeline ejecutara `pnpm check:boundaries` automaticamente. Si rompes las reglas, tu Pull Request sera rechazado.

## 2. Flujo de Trabajo (Git Workflow)

Utilizamos el flujo estandar de ramas de caracteristicas (Feature Branch Workflow).

1.  Asegurate de estar en la rama `main` y que este actualizada: `git pull origin main`
2.  Crea una nueva rama descriptiva:
    *   Para nuevas caracteristicas: `git checkout -b feat/nombre-de-la-funcionalidad`
    *   Para correccion de errores: `git checkout -b fix/problema-detectado`
    *   Para mantenimiento/dependencias: `git checkout -b chore/actualizar-libreria`
3.  Desarrolla tu cambio respetando la arquitectura.
4.  Asegurate de que las pruebas pasen ejecutando: `pnpm validate`
5.  Haz *commit* de tus cambios.

## 3. Estandares de Commits (Conventional Commits)

Exigimos nombres de commit claros y estructurados:

*   `feat: agrega soporte para clustering en el mapa`
*   `fix: corrige paginacion en directorio de ciudadanos`
*   `docs: actualiza documentacion de despliegue`
*   `test: a�ade pruebas de integracion para logistica`
*   `refactor: reestructura modulo de visitas`

## 4. Como enviar un Pull Request (PR)

1. Sube tu rama a GitHub: `git push origin tu-rama`
2. Abre un Pull Request contra la rama `main`.
3. Utiliza la plantilla proporcionada en `.github/PULL_REQUEST_TEMPLATE.md`.
4. Describe detalladamente que cambia, por que cambia y que impacto tiene.
5. Solicita revision de un administrador. No puedes fusionar (merge) tu propio codigo sin aprobacion.
