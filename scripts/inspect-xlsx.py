import zipfile
import xml.etree.ElementTree as ET

xlsx_path = "scripts/geo/raw/shp/Diccionario_SeccionesJalSept2022.xlsx"

with zipfile.ZipFile(xlsx_path, 'r') as z:
    print("Files in xlsx:", z.namelist())
    
    # Read shared strings
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        sst_xml = z.read('xl/sharedStrings.xml')
        sst_root = ET.fromstring(sst_xml)
        for si in sst_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            t = si.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
            shared_strings.append(t.text if t is not None else '')
            
    print(f"Total shared strings: {len(shared_strings)}")
    for i, s in enumerate(shared_strings[:40]):
        print(f"  [{i}]: {s}")

    # Read sheet1
    if 'xl/worksheets/sheet1.xml' in z.namelist():
        sheet_xml = z.read('xl/worksheets/sheet1.xml')
        sheet_root = ET.fromstring(sheet_xml)
        for row in sheet_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')[:20]:
            row_data = []
            for c in row.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                v = c.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                t = c.attrib.get('t')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit() and int(val) < len(shared_strings):
                    val = shared_strings[int(val)]
                row_data.append(val)
            print("Row:", row_data)
