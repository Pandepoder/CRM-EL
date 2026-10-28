import { redirect } from "next/navigation";

/**
 * Pantalla retirada (plan de auditoría de menús, D1). «Ajustes» ofrecía idioma, zona horaria, alertas, 2FA y
 * «Guardar cambios», y nada de eso guardaba algo (B1). Lo único real —el nombre y la contraseña— vive en
 * «Mi perfil → Seguridad», que es adonde se lleva a quien llegue por un enlace o un marcador viejo. Sin sesión,
 * el middleware lo manda antes al login y de ahí vuelve aquí.
 */
export default function AjustesRetirados() {
  redirect("/perfil?pestana=seguridad");
}
