-- Verifica si las cuentas de demostración existen en esta base de datos.
-- Si aparece alguna en un entorno real, trátala como comprometida: su contraseña
-- estuvo publicada en el repositorio y en los bundles compilados con el flag demo.
-- Uso: docker compose exec -T db psql -U <POSTGRES_USER> -d <POSTGRES_DB> -f /dev/stdin < scripts/db/check-demo-accounts.sql
SELECT email, display_name, status, created_at
FROM user_profiles
WHERE email IN (
  'admin.demo@tonala-os.local',
  'admin@tonala.gob.mx',
  'admin@elapp.com.mx',
  'coordinador.demo@tonala-os.local',
  'coord.centro@tonala.gob.mx',
  'capturista.demo@tonala-os.local',
  'responsable.demo@tonala-os.local',
  'brigada.norte@tonala.gob.mx',
  'direccion.demo@tonala-os.local'
);
