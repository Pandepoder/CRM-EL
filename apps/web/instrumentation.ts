/**
 * Se ejecuta una vez al arrancar el servidor.
 *
 * Revisa que el esquema de la base sea el que este código espera y, si faltan migraciones, lo
 * deja escrito en el registro de forma imposible de pasar por alto. Es lo que faltó cuando la base
 * iba dos migraciones por detrás: `/resumen` caía con un 500 y el único rastro era un
 * `column x.visit_id does not exist` perdido entre el resto del registro.
 *
 * No detiene el arranque aunque falten migraciones: un servidor que no arranca es una caída total,
 * y la mayoría de las pantallas siguen funcionando. El healthcheck responde 503 mientras tanto.
 *
 * Antes de nada, protege la consola: los errores que nadie atrapa los imprime Next por su cuenta,
 * y los de Drizzle traen los valores de la consulta (ver `protegerConsola`).
 */
export async function register() {
  // El `import` va DENTRO del `if`, y no detrás de un `return` temprano. Next compila este
  // archivo también para el runtime de edge y sustituye NEXT_RUNTIME por una constante: solo así
  // el compilador descarta el `import` en ese paquete. Con un `return` temprano no lo descartaba,
  // el paquete de edge intentaba incluir `pg` y la compilación fallaba con "Can't resolve 'fs'".
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { protegerConsola } = await import("./src/lib/registro");
    protegerConsola();
    const { revisarAlArrancar } = await import("./src/lib/estado-del-sistema");
    await revisarAlArrancar();
  }
}
