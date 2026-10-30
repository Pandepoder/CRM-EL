/**
 * Qué decirle a la persona cuando un dato del alta de ciudadano no pasa la validación (F6). Antes el panel
 * devolvía el mensaje de Zod tal cual —en inglés: «Too small: expected number to be >=1900»— y el registro
 * público solo decía «Datos de registro inválidos.». Ahora, por campo, qué está mal y cómo se escribe bien.
 *
 * Lo usan las dos altas (`/api/crm/contacts` y `/api/public/registro`), que validan los mismos datos.
 */
const POR_CAMPO: Readonly<Record<string, string>> = {
  firstName: "Escribe el nombre.",
  lastName: "Revisa el primer apellido: es demasiado largo.",
  maternalLastName: "Revisa el segundo apellido: es demasiado largo.",
  displayName: "Escribe el nombre.",
  fullName: "Escribe el nombre.",
  phone: "Revisa el teléfono: escribe 10 dígitos, por ejemplo 3312345678.",
  phoneNumber: "Revisa el teléfono: escribe 10 dígitos, por ejemplo 3312345678.",
  email: "Revisa el correo: parece que le falta algo (por ejemplo, nombre@gmail.com). Si no tiene, déjalo vacío.",
  birthDay: "Elige el día del cumpleaños.",
  birthMonth: "Elige el mes del cumpleaños.",
  birthYear: "Escribe el año con 4 dígitos, por ejemplo 1985, o déjalo vacío.",
  address: "Revisa la calle y el número: es demasiado largo.",
  colony: "Revisa la colonia: es demasiado larga.",
  municipality: "Elige el municipio de la lista.",
  sectionNum: "La sección son solo números; viene en la credencial del INE. Si no la sabes, déjala vacía.",
  postalCode: "El código postal son 5 números.",
  profession: "Revisa la ocupación: es demasiado larga.",
  knowMeBetter: "Lo que nos cuentas de ti es demasiado largo: resúmelo un poco.",
  survey: "Revisa las respuestas de la encuesta.",
  firstContactDate: "Revisa la fecha de primer contacto."
};

export const MENSAJE_GENERAL = "Revisa los datos marcados e intenta de nuevo.";

export function mensajeDeCampo(campo: string | undefined | null): string {
  return (campo && POR_CAMPO[campo]) || MENSAJE_GENERAL;
}
