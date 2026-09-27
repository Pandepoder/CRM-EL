/**
 * Los nombres en claro de lo que queda en `audit_logs`, y los grupos del filtro de la pantalla de
 * auditoría. Sin dependencias: lo usa también `tests/unit/auditoria-acciones.test.ts`, que falla si el
 * código escribe una acción que aquí no tiene nombre.
 */

/** El nombre en claro de cada acción, para la pantalla. Lo que no esté aquí sale con su clave. */
export const ACCIONES: Record<string, string> = {
  "user.create": "Alta de cuenta",
  "user.approve": "Solicitud aceptada",
  "user.reject": "Solicitud rechazada",
  "user.role_change": "Cambio de rol",
  "user.access_type_change": "Cambio de categoría",
  "user.activate": "Cuenta reactivada",
  "user.deactivate": "Cuenta dada de baja",
  "user.password_reset": "Contraseña restablecida",
  "user.sessions_closed": "Sesiones cerradas",
  "user.rename": "Cambio de nombre",
  "user.municipality_change": "Cambio de municipio",
  "user.delete": "Cuenta eliminada",
  "admin.master_named": "Administrador maestro nombrado",
  "admin.master_replaced": "Administrador maestro reemplazado",
  "admin.console_rescue": "Rescate desde la consola",
  "municipality.assign": "Municipio asignado",
  "master.view": "Consulta del maestro",
  "contacts.export": "Exportación del padrón",
  "contacts.deactivate": "Ciudadano dado de baja",
  "contacts.register": "Alta de ciudadano",
  "contacts.update": "Datos de ciudadano corregidos",
  "incidents.archive_resolved": "Incidencia archivada",
  "territory.contact_linked": "Domicilio vinculado",
  "assignments.responsible_assigned": "Responsable asignado",
  "visits.scheduled": "Visita agendada",
  "visits.completed": "Visita cerrada",
  "prospect.convert": "Prospecto convertido en ciudadano",
  "agenda.task.create": "Actividad registrada",
  "agenda.task.update": "Actividad editada",
  "agenda.task.start": "Actividad iniciada",
  "agenda.task.complete": "Actividad cerrada",
  "agenda.task.cancel": "Actividad cancelada",
  "agenda.task.reschedule": "Actividad reprogramada",
  "agenda.task.archive": "Actividad archivada",
  "agenda.task.restore": "Actividad restaurada",
  "agenda.catalog.create": "Opción de catálogo creada",
  "agenda.catalog.update": "Opción de catálogo editada",
  "agenda.catalog.archive": "Opción de catálogo archivada",
  "agenda.catalog.restore": "Opción de catálogo restaurada",
  "agenda.catalog.merge": "Opciones de catálogo fusionadas"
};

/** Grupos del filtro de la pantalla: prefijos de acción. */
export const GRUPOS_DE_ACCIONES = [
  { clave: "cuentas", etiqueta: "Cuentas y privilegios", prefijos: ["user.", "admin."] },
  { clave: "municipios", etiqueta: "Municipios", prefijos: ["municipality.", "user.municipality_change"] },
  { clave: "consultas", etiqueta: "Consultas del maestro", prefijos: ["master.view"] },
  { clave: "exportaciones", etiqueta: "Exportaciones", prefijos: ["contacts.export"] },
  { clave: "padron", etiqueta: "Ciudadanos", prefijos: ["contacts."] },
  { clave: "incidencias", etiqueta: "Incidencias y agenda", prefijos: ["incidents.", "agenda."] }
] as const;
