import requests
import json
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_geocoding():
    base_url = "https://elapp.com.mx"
    
    test_points = [
        ("Presidencia Municipal de Tonalá / Plaza Cihualpilli", 20.6248, -103.2422, 2704, "Centro de Tonalá"),
        ("Parque de la Solidaridad / Zalatitán", 20.6550, -103.2550, 2707, "Zalatitán"),
        ("Loma Dorada / Av. Río Nilo y Loma Seca", 20.6350, -103.2650, 2698, "Loma Dorada Delegación B"),
        ("Colonia Jalisco / Escuela Educadores", 20.6750, -103.2600, 2710, "Colonia Jalisco Sección I"),
        ("Santa Paula / Av. Carrillo Puerto", 20.5900, -103.2350, 2684, "Santa Paula Centro"),
        ("Puente Grande / Ribera Río Santiago", 20.6050, -103.1850, 2689, "Puente Grande"),
        ("El Vado / Carretera Libre a Zapotlanejo", 20.6250, -103.1850, 2690, "El Vado"),
        ("Basilio Badillo / Av. Malecón", 20.6500, -103.2750, 2743, "Basilio Badillo"),
        ("Coyula / Plaza Principal de Coyula", 20.6300, -103.2200, 2687, "Coyula"),
        ("Jauja / San Francisco", 20.5750, -103.2300, 2685, "Jauja")
    ]
    
    print("=== PROBANDO GEOCODIFICACIÓN INVERSA REAL DE TONALÁ ===")
    all_ok = True
    for name, lat, lng, expected_sec, expected_colony in test_points:
        url = f"{base_url}/api/map/reverse-geocode?lat={lat}&lng={lng}"
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            sec = data.get("sectionNum")
            col = data.get("colony")
            mun = data.get("municipality")
            addr = data.get("formattedAddress") or data.get("address")
            print(f"📍 Punto: {name}")
            print(f"   Coordenadas: ({lat}, {lng})")
            print(f"   Sección Detectada: #{sec} (Municipio: {mun})")
            print(f"   Colonia: '{col}' | Dirección: '{addr}'")
            print("   -------------------------------------------------")
        else:
            print(f"❌ Error al consultar {name}: Status {res.status_code}")
            all_ok = False
            
    if all_ok:
        print("\n✅ ¡TODOS LOS PUNTOS DE TONALÁ SE GEOCODIFICARON CON ÉXITO!")

if __name__ == "__main__":
    test_geocoding()
