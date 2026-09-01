import dbfread

try:
    table = dbfread.DBF('scripts/geo/raw/shp/SeccionesJalSept2022.dbf', encoding='latin1')
    print("Fields in DBF:", table.field_names)
    for i, record in enumerate(table):
        if i < 15:
            print(dict(record))
except Exception as e:
    print("Error reading DBF:", e)
