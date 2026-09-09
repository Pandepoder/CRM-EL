/**
 * Falla si el JavaScript que se sirve al navegador lleva dentro el acceso demo.
 *
 * Este control tiene que correr sobre el artefacto ya construido, no sobre la
 * configuracion. Next.js sustituye las variables NEXT_PUBLIC_* por su valor
 * durante la compilacion: leer el .env, el Dockerfile o el README dice con que
 * intencion se compilo, no que quedo dentro del bundle. Y como el valor queda
 * escrito en el JavaScript, apagar el flag despues de construir no lo borra.
 *
 * Uso: node scripts/check-bundle-secrets.mjs  (tras `pnpm web:build`)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR_BUNDLE = "apps/web/.next/static";

/**
 * Rastros propios del bloque de acceso demo. Si alguno aparece, el bloque quedo
 * compilado dentro del JavaScript que descarga el navegador.
 *
 * El dominio .local va aqui a proposito: es ASCII puro, asi que sobrevive intacto
 * a como el bundler decida serializar el resto de las cadenas.
 */
const MARCADORES_DEMO = ["Acceso Rápido de Demostración", "@tonala-os.local"];

/**
 * Deshace los escapes que introduce el bundler antes de comparar.
 *
 * Sin esto el control se autoenganaba: el bundle guarda "Acceso Rápido" como
 * "Acceso R\xe1pido" (y duplicado, "\\xe1", cuando la pagina viaja dentro de otra
 * cadena), de modo que buscar el texto acentuado devolvia cero coincidencias y el
 * control pasaba sobre un artefacto que si traia la demo.
 */
function normalizar(texto) {
  return texto
    .replace(/\\\\/g, "\\")
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function archivosJs(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivosJs(ruta));
    else if (ruta.endsWith(".js")) salida.push(ruta);
  }
  return salida;
}

function main() {
  try {
    statSync(DIR_BUNDLE);
  } catch {
    console.error(
      `[ERROR] No existe ${DIR_BUNDLE}. Ejecuta \`pnpm web:build\` antes de este control:\n` +
        "        sin artefacto no hay nada que verificar, y pasar por omision seria peor que fallar."
    );
    process.exit(1);
  }

  // Cualquier contrasena demo presente en el entorno no debe aparecer compilada.
  const credenciales = [process.env.NEXT_PUBLIC_DEMO_PASSWORD, process.env.DEMO_PASSWORD]
    .map((v) => v?.trim())
    .filter((v) => v && v.length >= 6);

  const hallazgos = [];
  for (const archivo of archivosJs(DIR_BUNDLE)) {
    const contenido = normalizar(readFileSync(archivo, "utf8"));
    for (const marcador of MARCADORES_DEMO) {
      if (contenido.includes(marcador)) {
        hallazgos.push(`${archivo}: contiene el bloque de acceso demo (${marcador})`);
      }
    }
    for (const credencial of credenciales) {
      if (contenido.includes(credencial)) {
        hallazgos.push(`${archivo}: contiene una contrasena de demostracion`);
      }
    }
  }

  if (hallazgos.length === 0) {
    console.log("[OK] El bundle del navegador no contiene el acceso demo ni sus credenciales.");
    return;
  }

  if (process.env.ALLOW_DEMO_BUNDLE === "true") {
    console.warn(
      "[AVISO] El bundle incluye el acceso demo, permitido por ALLOW_DEMO_BUNDLE=true.\n" +
        "        Este artefacto no debe publicarse en produccion."
    );
    for (const h of hallazgos) console.warn(`        ${h}`);
    return;
  }

  console.error("[ERROR] El bundle del navegador incluye el acceso de demostracion:");
  for (const h of hallazgos) console.error(`        ${h}`);
  console.error(
    "\n        Reconstruye con NEXT_PUBLIC_ENABLE_DEMO_LOGIN y NEXT_PUBLIC_DEMO_PASSWORD vacias.\n" +
      "        Cambiar el entorno sin reconstruir no quita la credencial de este artefacto.\n" +
      "        Para una demo intencionada, exporta ALLOW_DEMO_BUNDLE=true."
  );
  process.exit(1);
}

main();
