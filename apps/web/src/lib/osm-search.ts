/**
 * Consultas a Nominatim (OpenStreetMap) para los dos buscadores de dirección
 * de la aplicación: el del mapa (autocompletado) y el de la ficha de contacto.
 *
 * Estaban implementados por separado y no coincidían en nada: distinto recuadro
 * geográfico, distinto agente, distinto tiempo de espera y distinta forma de
 * situar la consulta. El del mapa cubría medio occidente de México con
 * `bounded=0` —es decir, sin restricción real— y el otro no acotaba en absoluto.
 * De ahí salían direcciones de Guanajuato o de Chapala en un sistema que opera
 * en el Área Metropolitana de Guadalajara.
 */

/**
 * Recuadro del AMG: Zapopan al poniente, Zapotlanejo al oriente, Tlajomulco e
 * Ixtlahuacán al sur. Cubre los nueve municipios del selector y deja fuera la
 * ribera de Chapala, que colaba homónimos.
 */
export const RECUADRO_AMG = "-103.70,20.95,-102.95,20.35";

/** Jalisco entero, para cuando dentro del AMG no hay ninguna coincidencia. */
export const RECUADRO_JALISCO = "-105.70,22.75,-101.50,18.90";

type Opciones = {
  /** Aplica el recuadro como restricción dura (`bounded=1`). */
  acotado: boolean;
  recuadro?: string;
  limite?: number;
  /** El autocompletado dispara por pulsación, así que espera menos. */
  msEspera?: number;
};

/**
 * Situa una búsqueda en su municipio salvo que el texto ya diga dónde está.
 *
 * El sufijo hace falta de verdad, no es adorno: medido contra Nominatim, "Loma
 * Dorada" a secas no encuentra la Avenida Loma Dorada de Tonalá —gana un paraje
 * homónimo de Chapala—, mientras que "Loma Dorada, Tonalá, Jalisco" devuelve sus
 * tres tramos. El recuadro acota, el sufijo orienta; hacen falta los dos.
 */
export function situarConsulta(texto: string, municipio: string): string {
  const yaSituada = /jalisco|guadalajara|zapopan|tlaquepaque|tonal[aá]/i.test(texto);
  return yaSituada ? texto : `${texto}, ${municipio}, Jalisco`;
}

export async function buscarEnOSM(consulta: string, opciones: Opciones): Promise<any[]> {
  const params = new URLSearchParams({
    format: "json",
    q: consulta,
    countrycodes: "mx",
    addressdetails: "1",
    limit: String(opciones.limite ?? 8),
    "accept-language": "es-MX,es"
  });
  if (opciones.acotado) {
    params.set("viewbox", opciones.recuadro ?? RECUADRO_AMG);
    params.set("bounded", "1");
  }

  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), opciones.msEspera ?? 3500);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "Tonala-OS-CRM/1.0 (territorial-planning-system)",
        "Accept-Language": "es-MX,es;q=0.9"
      },
      signal: controlador.signal
    });
    if (!res.ok) return [];
    const datos = await res.json();
    return Array.isArray(datos) ? datos : [];
  } catch {
    // Tiempo agotado o red caída: el buscador sigue con lo que tenga de la base.
    return [];
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Primero dentro del AMG; si ahí no hay nada, se amplía a Jalisco antes de
 * darse por vencido. Ampliar solo cuando el resultado sería vacío evita que una
 * coincidencia lejana desplace a una cercana.
 */
export async function buscarDireccion(
  texto: string,
  municipio: string,
  opciones?: { limite?: number; msEspera?: number }
): Promise<any[]> {
  const consulta = situarConsulta(texto, municipio);
  const cercanas = await buscarEnOSM(consulta, { acotado: true, ...opciones });
  if (cercanas.length > 0) return cercanas;
  return buscarEnOSM(consulta, { acotado: true, recuadro: RECUADRO_JALISCO, ...opciones });
}
