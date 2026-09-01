import xml.etree.ElementTree as ET
import os

kml_path = "scripts/geo/raw/kml/SeccionesJalSept2022.kml"
tree = ET.parse(kml_path)
root = tree.getroot()
ns = {'kml': 'http://www.opengis.net/kml/2.2'}

placemarks = root.findall('.//kml:Placemark', ns)
print(f"Total Placemarks: {len(placemarks)}")

for i in range(min(10, len(placemarks))):
    pm = placemarks[i]
    name = pm.find('kml:name', ns)
    print(f"\n--- Placemark {i+1}: {name.text if name is not None else 'No name'} ---")
    
    # ExtendedData
    ext = pm.find('kml:ExtendedData', ns)
    if ext is not None:
        for sd in ext.findall('.//kml:SimpleData', ns):
            print(f"  {sd.attrib.get('name')}: {sd.text}")
        for data in ext.findall('.//kml:Data', ns):
            val = data.find('kml:value', ns)
            print(f"  {data.attrib.get('name')}: {val.text if val is not None else ''}")
    
    desc = pm.find('kml:description', ns)
    if desc is not None and desc.text:
        print(f"  description: {desc.text[:200]}")
