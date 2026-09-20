import SettingsClient from "./SettingsClient";

/**
 * La guarda vive solo en settings/layout.tsx, que cierra toda la sección a
 * administración. No se repite aquí a propósito: con la regla en un único sitio,
 * cualquier pantalla que se añada bajo /settings queda cerrada desde el principio
 * y no hay dos listas de roles que puedan acabar diciendo cosas distintas.
 */
export default function SettingsPage() {
  return <SettingsClient />;
}


