import xml.etree.ElementTree as ET
from tonala_official_colonies_dict import TONALA_EXACT_SECTIONS_COLONIES
import os

kml_path = "scripts/geo/raw/kml/SeccionesJalSept2022.kml"
tree = ET.parse(kml_path)
root = tree.getroot()
ns = {'kml': 'http://www.opengis.net/kml/2.2'}

tonala_kml_sections = set()
for pm in root.findall('.//kml:Placemark', ns):
    ext = pm.find('kml:ExtendedData', ns)
    if ext is not None:
        muni = None
        sec = None
        for sd in ext.findall('.//kml:SimpleData', ns):
            if sd.attrib.get('name') == 'MUNICIPIO':
                muni = int(float(sd.text))
            elif sd.attrib.get('name') == 'SECCION':
                sec = int(float(sd.text))
        if muni == 102 and sec is not None:
            tonala_kml_sections.add(sec)

print(f"Total Tonalá sections in INE KML (MUNICIPIO=102): {len(tonala_kml_sections)}")
print(f"Total sections in our dictionary: {len(TONALA_EXACT_SECTIONS_COLONIES)}")

missing_in_dict = tonala_kml_sections - set(TONALA_EXACT_SECTIONS_COLONIES.keys())
print("Missing in dictionary:", sorted(list(missing_in_dict)))
extra_in_dict = set(TONALA_EXACT_SECTIONS_COLONIES.keys()) - tonala_kml_sections
print("Extra in dictionary:", sorted(list(extra_in_dict)))
