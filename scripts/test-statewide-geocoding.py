import requests
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_jalisco_geocoding():
    base_url = "https://elapp.com.mx"
    
    test_points = [
        ("Tonalá - Centro / Presidencia", 20.6248, -103.2422),
        ("Guadalajara - Catedral / Centro Histórico", 20.6770, -103.3470),
        ("Zapopan - Basílica de Zapopan / Centro", 20.7214, -103.3917),
        ("San Pedro Tlaquepaque - El Parián / Centro", 20.6405, -103.3150),
        ("Tlajomulco de Zúñiga - Cabecera", 20.4740, -103.4350),
        ("El Salto - Plaza Principal", 20.5180, -103.1800),
        ("Puerto Vallarta - Malecón", 20.6120, -105.2340),
        ("Lagos de Moreno - Centro", 21.3530, -101.9280),
        ("Tepatitlán de Morelos - Plaza Morelos", 20.8170, -102.7630)
    ]
    
    print("=== VERIFICANDO GEOCODIFICACIÓN EN DIVERSOS MUNICIPIOS DE JALISCO ===")
    for name, lat, lng in test_points:
        url = f"{base_url}/api/map/reverse-geocode?lat={lat}&lng={lng}"
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            print(f"📍 {name}:")
            print(f"   Sección: #{data.get('sectionNum')} | Municipio: '{data.get('municipality')}' | Dirección: '{data.get('formattedAddress') or data.get('address')}'")
            print("   -------------------------------------------------")
        else:
            print(f"❌ Error al consultar {name}: Status {res.status_code}")

if __name__ == "__main__":
    test_jalisco_geocoding()
