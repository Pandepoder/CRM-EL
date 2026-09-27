-- El domicilio de quien trabaja en la estructura (brigadista, capturista, líder…). Decisión del dueño
-- (2026-09-26): se pide en el formulario de registro —el QR de brigada (`/unirme`) y el auto-registro
-- (`/register`)—; el alta por administración no lo pide. Antes ninguna vía de alta de una cuenta lo
-- preguntaba.
--
-- Va aparte del municipio de la cuenta (`municipality` y su llave `municipality_id`): ese es el
-- municipio donde trabaja, y decide qué ve y quién la gobierna (0022, 0023). Donde vive no cambia nada
-- de eso. Calle y colonia se guardan cifradas, como el teléfono de la cuenta; el municipio es uno del
-- catálogo, en claro.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo añade columnas que admiten nulo, que la
-- versión anterior ni lee ni escribe. Se puede correr dos veces sin efecto. Escrita a mano (ver D6).

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "home_address" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "home_colony" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "home_municipality" text;
