/**
 * Contrasena de las cuentas de demostracion para los scripts de prueba.
 *
 * Vive en el entorno, no en el codigo. Antes cada script de prueba la llevaba
 * escrita, asi que la misma credencial estaba repetida en once archivos del
 * repositorio y rotarla obligaba a editarlos todos. Sin valor por defecto: un
 * script que falla por falta de configuracion es preferible a uno que se
 * autentica con una contrasena publicada.
 */
export function demoPassword(): string {
  const password = process.env.DEMO_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "Falta DEMO_PASSWORD: exportala antes de ejecutar este script de prueba."
    );
  }
  return password;
}
