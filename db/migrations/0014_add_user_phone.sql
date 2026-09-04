-- Teléfono del integrante de la estructura.
--
-- Los ciudadanos tenían teléfono desde el principio; quienes trabajan la
-- campaña, no. Un líder que suma a alguien a su brigada desde el QR no tenía
-- forma de localizarlo dentro del sistema y acababa buscándolo en WhatsApp.
--
-- Va cifrado en reposo con el mismo tipo que el de los contactos (AES-256-GCM),
-- así que en la base no se lee en claro.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "phone" text;
