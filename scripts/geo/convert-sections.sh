#!/bin/bash
set -e

# Descargar y convertir cartografía de INE
# NOTA: Requiere mapshaper instalado globalmente (npm install -g mapshaper)
# o tippecanoe si se usan PMTiles.

GEO_DIR="apps/web/public/geo"
mkdir -p "$GEO_DIR"

echo "Procesando secciones de Jalisco para extraer Tonalá (14097)..."

# Asumimos que el usuario descargó el shapefile de Jalisco en raw/SECCIONES_JALISCO.shp
# y lo descomprimió en una carpeta scripts/geo/raw/
if [ ! -f "scripts/geo/raw/SECCIONES_JALISCO.shp" ]; then
  echo "Error: Falta el archivo scripts/geo/raw/SECCIONES_JALISCO.shp"
  echo "Descarga la cartografía electoral desde el portal de INE y extrae el zip aquí."
  exit 1
fi

mapshaper scripts/geo/raw/SECCIONES_JALISCO.shp \
  -filter "MUNICIPIO == 14097" \
  -simplify dp 10% \
  -o format=geojson "$GEO_DIR/tonala-secciones.geojson"

echo "¡GeoJSON generado en $GEO_DIR/tonala-secciones.geojson!"
