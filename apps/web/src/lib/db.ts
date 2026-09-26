import pg from "pg";

import { loadAppEnv } from "@tonala/config";

// Singleton que sobrevive hot-reload de Next.js en desarrollo.
// En producción el proceso no recarga, así que el comportamiento es idéntico.
declare global {
  var __tonalaDbPool: pg.Pool | undefined;
}

export function getDatabasePool(): pg.Pool {
  if (!global.__tonalaDbPool) {
    const env = loadAppEnv();
    const pool = new pg.Pool({
      connectionString: env.private.DATABASE_URL,
      max: env.private.DATABASE_POOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: env.private.DATABASE_CONNECTION_TIMEOUT_MS,
      // Límites del lado del servidor, por sentencia y por conexión.
      //
      // Sin ellos, una consulta desbocada o una transacción que se queda abierta retienen su
      // conexión indefinidamente; con un pool de 10, bastan diez para que la aplicación entera
      // se quede esperando. Son límites POR SENTENCIA, no por petición: la importación de
      // secciones, que hace una sentencia por sección, no los roza.
      statement_timeout: env.private.DATABASE_STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: env.private.DATABASE_IDLE_IN_TRANSACTION_TIMEOUT_MS
    });

    // Sin este manejador, un reinicio de Postgres TUMBA EL PROCESO.
    //
    // `pg` emite 'error' en el pool cuando se cae una conexión que estaba inactiva, y en Node un
    // evento 'error' sin nadie escuchando termina el proceso. Reproducido con un pool como este:
    // tres conexiones inactivas, `docker restart` de la base, y el proceso murió con
    // "Unhandled 'error' event" y código 1. Con el manejador, las tres caídas se registran y el
    // pool abre conexiones nuevas en la siguiente consulta, cuando la base ya volvió.
    //
    // No se reintenta ninguna consulta aquí: repetir a ciegas una escritura podría duplicarla. El
    // reintento seguro vive donde hay idempotencia —el botón de las pantallas de error y, más
    // adelante, la cola de reintento con `clientRequestId`—.
    pool.on("error", (error) => {
      console.error("[db] Se perdió una conexión inactiva del pool; se abrirá otra al necesitarla.", {
        mensaje: error.message
      });
    });

    global.__tonalaDbPool = pool;
  }
  return global.__tonalaDbPool;
}
