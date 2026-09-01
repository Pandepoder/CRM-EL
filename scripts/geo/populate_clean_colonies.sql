BEGIN;

    DROP INDEX IF EXISTS colonies_catalog_name_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS colonies_catalog_name_muni_unique ON colonies(catalog_version_id, name, municipality);
    

    DELETE FROM section_colonies 
    WHERE colony_id IN (
        SELECT id FROM colonies WHERE name LIKE 'Cabecera %' OR name LIKE 'Municipio %'
    );
    DELETE FROM colonies WHERE name LIKE 'Cabecera %' OR name LIKE 'Municipio %';
    
-- === TONALÁ EXACT COLONIES MAPPINGS ===

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Delegación A',
                '45402',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Delegación A' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45402' WHERE name = 'Loma Dorada Delegación A' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2693
              AND col.name = 'Loma Dorada Delegación A'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de la Cañada',
                '45402',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de la Cañada' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45402' WHERE name = 'Paseos de la Cañada' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2693
              AND col.name = 'Paseos de la Cañada'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rincón de la Loma',
                '45402',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rincón de la Loma' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45402' WHERE name = 'Rincón de la Loma' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2693
              AND col.name = 'Rincón de la Loma'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Los Arcos',
                '45402',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Los Arcos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45402' WHERE name = 'Loma Dorada Los Arcos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2694
              AND col.name = 'Loma Dorada Los Arcos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Sección Los Arcos',
                '45402',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Sección Los Arcos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45402' WHERE name = 'Loma Dorada Sección Los Arcos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2694
              AND col.name = 'Loma Dorada Sección Los Arcos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada de la Loma',
                '45402',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada de la Loma' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45402' WHERE name = 'Rinconada de la Loma' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2694
              AND col.name = 'Rinconada de la Loma'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Loma Alta',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Loma Alta' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Loma Dorada Loma Alta' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2695
              AND col.name = 'Loma Dorada Loma Alta'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Sección Loma Alta',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Sección Loma Alta' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Loma Dorada Sección Loma Alta' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2695
              AND col.name = 'Loma Dorada Sección Loma Alta'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coto del Río Nilo',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coto del Río Nilo' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Coto del Río Nilo' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2695
              AND col.name = 'Coto del Río Nilo'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Circuito Cañada',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Circuito Cañada' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Loma Dorada Circuito Cañada' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2696
              AND col.name = 'Loma Dorada Circuito Cañada'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos del Prado',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos del Prado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Paseos del Prado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2696
              AND col.name = 'Paseos del Prado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Valle del Sol',
                '45404',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Valle del Sol' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45404' WHERE name = 'Loma Dorada Valle del Sol' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2697
              AND col.name = 'Loma Dorada Valle del Sol'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Valle',
                '45404',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Valle' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45404' WHERE name = 'Lomas del Valle' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2697
              AND col.name = 'Lomas del Valle'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Delegación B',
                '45404',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Delegación B' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45404' WHERE name = 'Loma Dorada Delegación B' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2698
              AND col.name = 'Loma Dorada Delegación B'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas del Palmar',
                '45404',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas del Palmar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45404' WHERE name = 'Villas del Palmar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2698
              AND col.name = 'Villas del Palmar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Delegación C',
                '45404',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Delegación C' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45404' WHERE name = 'Loma Dorada Delegación C' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2699
              AND col.name = 'Loma Dorada Delegación C'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Misión de la Cantera',
                '45404',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Misión de la Cantera' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45404' WHERE name = 'Misión de la Cantera' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2699
              AND col.name = 'Misión de la Cantera'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Delegación D',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Delegación D' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Loma Dorada Delegación D' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2700
              AND col.name = 'Loma Dorada Delegación D'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Bonita Tonalá',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Bonita Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Loma Bonita Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2700
              AND col.name = 'Loma Bonita Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Manantial Norte',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Manantial Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Lomas del Manantial Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2701
              AND col.name = 'Lomas del Manantial Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de Tonalá',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Paseos de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2701
              AND col.name = 'Paseos de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas de Tonalá',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Villas de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2702
              AND col.name = 'Villas de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Fracc. La Providencia',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Fracc. La Providencia' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Fracc. La Providencia' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2702
              AND col.name = 'Fracc. La Providencia'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Dorada Loma Sur',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Dorada Loma Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Loma Dorada Loma Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2703
              AND col.name = 'Loma Dorada Loma Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jardines de la Cañada',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jardines de la Cañada' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Jardines de la Cañada' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2703
              AND col.name = 'Jardines de la Cañada'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Real de las Lomas',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Real de las Lomas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Real de las Lomas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2705
              AND col.name = 'Real de las Lomas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de la Soledad',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de la Soledad' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Lomas de la Soledad' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2705
              AND col.name = 'Lomas de la Soledad'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Centro de Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Centro de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Centro de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704
              AND col.name = 'Centro de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Alfareros',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Alfareros' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Alfareros' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704
              AND col.name = 'Alfareros'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Cihualpilli',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Cihualpilli' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Cihualpilli' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704
              AND col.name = 'Cihualpilli'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Arcos Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Arcos Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Los Arcos Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704
              AND col.name = 'Los Arcos Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz de las Huertas',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz de las Huertas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Santa Cruz de las Huertas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2708
              AND col.name = 'Santa Cruz de las Huertas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Rosario',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Rosario' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'El Rosario' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2708
              AND col.name = 'El Rosario'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Arroyo Seco',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Arroyo Seco' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Arroyo Seco' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2708
              AND col.name = 'Arroyo Seco'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Pachaguilla',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Pachaguilla' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Pachaguilla' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2714
              AND col.name = 'Pachaguilla'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Barrio Nuevo',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Barrio Nuevo' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Barrio Nuevo' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2714
              AND col.name = 'Barrio Nuevo'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                '20 de Noviembre',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = '20 de Noviembre' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = '20 de Noviembre' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2714
              AND col.name = '20 de Noviembre'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz Centro',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Santa Cruz Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2715
              AND col.name = 'Santa Cruz Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Huerta',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Huerta' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'La Huerta' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2715
              AND col.name = 'La Huerta'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz Oriente',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Santa Cruz Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2715
              AND col.name = 'Santa Cruz Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Felipe',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Felipe' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'San Felipe' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2716
              AND col.name = 'San Felipe'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Linda Vista',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Linda Vista' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Linda Vista' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2716
              AND col.name = 'Linda Vista'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Panorámico',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Panorámico' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'El Panorámico' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2716
              AND col.name = 'El Panorámico'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tonalá Centro Sur',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tonalá Centro Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Tonalá Centro Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2717
              AND col.name = 'Tonalá Centro Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Encinos',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Encinos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Los Encinos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2717
              AND col.name = 'Los Encinos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Silos',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Silos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Los Silos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2717
              AND col.name = 'Los Silos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz Poniente',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz Poniente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Santa Cruz Poniente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2718
              AND col.name = 'Santa Cruz Poniente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Manantial',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Manantial' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Lomas del Manantial' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2718
              AND col.name = 'Lomas del Manantial'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Jagüey',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Jagüey' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'El Jagüey' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2719
              AND col.name = 'El Jagüey'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Cuchara',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Cuchara' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'La Cuchara' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2719
              AND col.name = 'La Cuchara'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Cerro del Rey',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Cerro del Rey' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Cerro del Rey' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2719
              AND col.name = 'Cerro del Rey'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Crucero',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Crucero' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'El Crucero' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2720
              AND col.name = 'El Crucero'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tierras Blancas',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tierras Blancas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Tierras Blancas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2720
              AND col.name = 'Tierras Blancas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Altamira',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Altamira' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Altamira' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2720
              AND col.name = 'Altamira'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Mesita',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Mesita' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'La Mesita' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2721
              AND col.name = 'La Mesita'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Zalate Centro',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Zalate Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'El Zalate Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2721
              AND col.name = 'El Zalate Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Barrio San Gaspar',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Barrio San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Barrio San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2723
              AND col.name = 'Barrio San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Capilla Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Capilla Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'La Capilla Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2723
              AND col.name = 'La Capilla Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tonalá Centro Norte',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tonalá Centro Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Tonalá Centro Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2650
              AND col.name = 'Tonalá Centro Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Barrio La Cruz',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Barrio La Cruz' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Barrio La Cruz' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2650
              AND col.name = 'Barrio La Cruz'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Emiliano Zapata',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Emiliano Zapata' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Emiliano Zapata' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2650
              AND col.name = 'Emiliano Zapata'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Barrio Santa María',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Barrio Santa María' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Barrio Santa María' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2651
              AND col.name = 'Barrio Santa María'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Rosas',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Rosas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Las Rosas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2651
              AND col.name = 'Las Rosas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Maestros',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Maestros' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Los Maestros' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2651
              AND col.name = 'Los Maestros'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jardines de Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jardines de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Jardines de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2652
              AND col.name = 'Jardines de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Francisco Villa',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Francisco Villa' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Francisco Villa' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2652
              AND col.name = 'Francisco Villa'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Camichín',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Camichín' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Lomas del Camichín' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2653
              AND col.name = 'Lomas del Camichín'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Prados de Coyula',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Prados de Coyula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Prados de Coyula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2653
              AND col.name = 'Prados de Coyula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Fraccionamiento San Felipe',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Fraccionamiento San Felipe' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Fraccionamiento San Felipe' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2654
              AND col.name = 'Fraccionamiento San Felipe'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de San Gaspar',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Lomas de San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2654
              AND col.name = 'Lomas de San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Lomas de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2655
              AND col.name = 'Lomas de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada de los Arcos',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada de los Arcos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Rinconada de los Arcos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2655
              AND col.name = 'Rinconada de los Arcos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Arboledas de San Gaspar',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Arboledas de San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Arboledas de San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2656
              AND col.name = 'Arboledas de San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coto Linda Vista',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coto Linda Vista' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Coto Linda Vista' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2656
              AND col.name = 'Coto Linda Vista'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Gaspar Centro',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Gaspar Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San Gaspar Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2657
              AND col.name = 'San Gaspar Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Residencial San Gaspar',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Residencial San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Residencial San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2657
              AND col.name = 'Residencial San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Balcones del Rosario',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Balcones del Rosario' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Balcones del Rosario' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2658
              AND col.name = 'Balcones del Rosario'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Sauz Tonalá',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Sauz Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'El Sauz Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2658
              AND col.name = 'El Sauz Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Huizachera',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Huizachera' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'La Huizachera' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2659
              AND col.name = 'La Huizachera'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coto el Manantial',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coto el Manantial' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Coto el Manantial' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2659
              AND col.name = 'Coto el Manantial'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Prados del Manantial',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Prados del Manantial' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Prados del Manantial' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2660
              AND col.name = 'Prados del Manantial'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coto de la Barranca',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coto de la Barranca' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Coto de la Barranca' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2660
              AND col.name = 'Coto de la Barranca'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Martha',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Martha' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Santa Martha' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2661
              AND col.name = 'Santa Martha'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Linda Centro',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Linda Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Loma Linda Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2661
              AND col.name = 'Loma Linda Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz de las Huertas Norte',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz de las Huertas Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Santa Cruz de las Huertas Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2663
              AND col.name = 'Santa Cruz de las Huertas Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Balcones de la Cruz',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Balcones de la Cruz' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Balcones de la Cruz' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2663
              AND col.name = 'Balcones de la Cruz'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Almendros',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Almendros' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Los Almendros' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2664
              AND col.name = 'Los Almendros'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de Santa Cruz',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de Santa Cruz' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Paseos de Santa Cruz' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2664
              AND col.name = 'Paseos de Santa Cruz'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Rosario',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Rosario' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Lomas del Rosario' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2665
              AND col.name = 'Lomas del Rosario'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Praderas del Rosario',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Praderas del Rosario' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Praderas del Rosario' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2665
              AND col.name = 'Praderas del Rosario'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Francisco Silva Romero',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Francisco Silva Romero' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Francisco Silva Romero' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2666
              AND col.name = 'Francisco Silva Romero'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Elías',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Elías' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'San Elías' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2666
              AND col.name = 'San Elías'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de San Salvador',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de San Salvador' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Lomas de San Salvador' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2667
              AND col.name = 'Lomas de San Salvador'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Residencial la Soledad',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Residencial la Soledad' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Residencial la Soledad' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2667
              AND col.name = 'Residencial la Soledad'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Salvador',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Salvador' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'San Salvador' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2668
              AND col.name = 'San Salvador'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Carmen',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Carmen' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Lomas del Carmen' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2668
              AND col.name = 'Lomas del Carmen'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Palmas de Tonalá',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Palmas de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Las Palmas de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2669
              AND col.name = 'Las Palmas de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villa Fontana Tonalá',
                '45415',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villa Fontana Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45415' WHERE name = 'Villa Fontana Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2669
              AND col.name = 'Villa Fontana Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda del Valle',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda del Valle' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Hacienda del Valle' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2670
              AND col.name = 'Hacienda del Valle'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos del Valle',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos del Valle' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Paseos del Valle' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2670
              AND col.name = 'Paseos del Valle'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Ameyal',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Ameyal' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'El Ameyal' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2671
              AND col.name = 'El Ameyal'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Amiales',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Amiales' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Los Amiales' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2671
              AND col.name = 'Los Amiales'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rey Xólotl',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rey Xólotl' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Rey Xólotl' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2672
              AND col.name = 'Rey Xólotl'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Infonavit Río Nilo',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Infonavit Río Nilo' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Infonavit Río Nilo' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2672
              AND col.name = 'Infonavit Río Nilo'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Loma Centro',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Loma Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'La Loma Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2673
              AND col.name = 'La Loma Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada del Manantial',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada del Manantial' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Rinconada del Manantial' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2673
              AND col.name = 'Rinconada del Manantial'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada del Río Nilo',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada del Río Nilo' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Rinconada del Río Nilo' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2674
              AND col.name = 'Rinconada del Río Nilo'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coto Río Nilo Sur',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coto Río Nilo Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Coto Río Nilo Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2674
              AND col.name = 'Coto Río Nilo Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Fraccionamiento Río Nilo',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Fraccionamiento Río Nilo' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Fraccionamiento Río Nilo' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2675
              AND col.name = 'Fraccionamiento Río Nilo'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Valle de la Providencia',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Valle de la Providencia' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Valle de la Providencia' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2675
              AND col.name = 'Valle de la Providencia'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Residencial la Providencia',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Residencial la Providencia' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Residencial la Providencia' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2677
              AND col.name = 'Residencial la Providencia'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de Tonalá Poniente',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de Tonalá Poniente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Lomas de Tonalá Poniente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2677
              AND col.name = 'Lomas de Tonalá Poniente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Teresita Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Teresita Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Santa Teresita Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2678
              AND col.name = 'Santa Teresita Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coto San Miguel',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coto San Miguel' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Coto San Miguel' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2678
              AND col.name = 'Coto San Miguel'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Severiana Norte',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Severiana Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'La Severiana Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2679
              AND col.name = 'La Severiana Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Mirador de Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Mirador de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'El Mirador de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2679
              AND col.name = 'El Mirador de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada del Prado',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada del Prado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Rinconada del Prado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2680
              AND col.name = 'Rinconada del Prado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Fracc. Las Torres',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Fracc. Las Torres' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Fracc. Las Torres' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2680
              AND col.name = 'Fracc. Las Torres'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Alberca',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Alberca' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'La Alberca' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2681
              AND col.name = 'La Alberca'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Cuartas',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Cuartas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Las Cuartas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2681
              AND col.name = 'Las Cuartas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San José de la Soledad',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San José de la Soledad' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'San José de la Soledad' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2682
              AND col.name = 'San José de la Soledad'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Rosa Tonalá',
                '45400',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Rosa Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45400' WHERE name = 'Santa Rosa Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2682
              AND col.name = 'Santa Rosa Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Límite Periférico',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Límite Periférico' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Límite Periférico' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2709
              AND col.name = 'Colonia Jalisco Límite Periférico'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Julián',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Julián' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'San Julián' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2709
              AND col.name = 'San Julián'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Sección I',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Sección I' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Sección I' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2710
              AND col.name = 'Colonia Jalisco Sección I'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Educadores Jaliscienses',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Educadores Jaliscienses' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Educadores Jaliscienses' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2710
              AND col.name = 'Educadores Jaliscienses'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Norte',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2712
              AND col.name = 'Colonia Jalisco Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Refugio Norte',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Refugio Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'El Refugio Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2712
              AND col.name = 'El Refugio Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco La Capilla',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco La Capilla' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco La Capilla' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2713
              AND col.name = 'Colonia Jalisco La Capilla'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Pedro Jalisco',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Pedro Jalisco' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'San Pedro Jalisco' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2713
              AND col.name = 'San Pedro Jalisco'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Sección II',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Sección II' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Sección II' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3704
              AND col.name = 'Colonia Jalisco Sección II'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Perla',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Perla' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'La Perla' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3704
              AND col.name = 'La Perla'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Sección III',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Sección III' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Sección III' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3705
              AND col.name = 'Colonia Jalisco Sección III'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Antonio',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Antonio' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'San Antonio' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3705
              AND col.name = 'San Antonio'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Sección IV',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Sección IV' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Sección IV' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3706
              AND col.name = 'Colonia Jalisco Sección IV'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Misión San Francisco',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Misión San Francisco' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Misión San Francisco' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3706
              AND col.name = 'Misión San Francisco'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Sección V',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Sección V' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Sección V' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3707
              AND col.name = 'Colonia Jalisco Sección V'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada de San Gaspar',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada de San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Rinconada de San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3707
              AND col.name = 'Rinconada de San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Sección VI',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Sección VI' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Sección VI' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3708
              AND col.name = 'Colonia Jalisco Sección VI'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Pinos Norte',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Pinos Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Los Pinos Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3708
              AND col.name = 'Los Pinos Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco San Gabriel',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco San Gabriel' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco San Gabriel' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3709
              AND col.name = 'Colonia Jalisco San Gabriel'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Aurora Jalisco',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Aurora Jalisco' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'La Aurora Jalisco' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3709
              AND col.name = 'La Aurora Jalisco'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Jalisco Lomas Altas',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Jalisco Lomas Altas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Colonia Jalisco Lomas Altas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3710
              AND col.name = 'Colonia Jalisco Lomas Altas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Misión del Valle',
                '45403',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Misión del Valle' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45403' WHERE name = 'Misión del Valle' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3710
              AND col.name = 'Misión del Valle'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zalatitán Centro',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zalatitán Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Zalatitán Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2707
              AND col.name = 'Zalatitán Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Alamedas de Zalatitán',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Alamedas de Zalatitán' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Alamedas de Zalatitán' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2707
              AND col.name = 'Alamedas de Zalatitán'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Arcos de Zalatitán',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Arcos de Zalatitán' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Arcos de Zalatitán' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2707
              AND col.name = 'Arcos de Zalatitán'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Camichines',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Camichines' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Los Camichines' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2726
              AND col.name = 'Los Camichines'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zalatitán Norte',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zalatitán Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Zalatitán Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2726
              AND col.name = 'Zalatitán Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas de Zalatitán',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas de Zalatitán' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Villas de Zalatitán' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2727
              AND col.name = 'Villas de Zalatitán'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Aurora',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Aurora' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'La Aurora' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2727
              AND col.name = 'La Aurora'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zalatitán Sur',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zalatitán Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Zalatitán Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2729
              AND col.name = 'Zalatitán Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Francisco',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Francisco' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'San Francisco' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2729
              AND col.name = 'San Francisco'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Huertita',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Huertita' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'La Huertita' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3711
              AND col.name = 'La Huertita'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos del Zalate',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos del Zalate' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Paseos del Zalate' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3711
              AND col.name = 'Paseos del Zalate'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Linda Zalatitán',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Linda Zalatitán' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Loma Linda Zalatitán' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3712
              AND col.name = 'Loma Linda Zalatitán'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada del Sol',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada del Sol' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Rinconada del Sol' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3712
              AND col.name = 'Rinconada del Sol'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zalatitán Los Pinos',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zalatitán Los Pinos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Zalatitán Los Pinos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3713
              AND col.name = 'Zalatitán Los Pinos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Triángulo',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Triángulo' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'El Triángulo' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3713
              AND col.name = 'El Triángulo'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zalatitán Ampliación',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zalatitán Ampliación' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Zalatitán Ampliación' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3714
              AND col.name = 'Zalatitán Ampliación'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Arcos del Zalate',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Arcos del Zalate' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Arcos del Zalate' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3714
              AND col.name = 'Arcos del Zalate'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Camichines Oriente',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Camichines Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Los Camichines Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3715
              AND col.name = 'Los Camichines Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Camichín Blanco',
                '45405',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Camichín Blanco' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45405' WHERE name = 'Camichín Blanco' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3715
              AND col.name = 'Camichín Blanco'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Paula Norte',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Paula Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Santa Paula Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2683
              AND col.name = 'Santa Paula Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Praderas del Sol',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Praderas del Sol' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Praderas del Sol' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2683
              AND col.name = 'Praderas del Sol'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Gitanilla',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Gitanilla' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'La Gitanilla' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2683
              AND col.name = 'La Gitanilla'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Paula Centro',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Paula Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Santa Paula Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2684
              AND col.name = 'Santa Paula Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Ladrillera',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Ladrillera' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'La Ladrillera' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2684
              AND col.name = 'La Ladrillera'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda Real Sur',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda Real Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Hacienda Real Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2684
              AND col.name = 'Hacienda Real Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jauja',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jauja' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'Jauja' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2685
              AND col.name = 'Jauja'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Severiana',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Severiana' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'La Severiana' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2685
              AND col.name = 'La Severiana'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colonia Guadalupana',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colonia Guadalupana' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'Colonia Guadalupana' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2685
              AND col.name = 'Colonia Guadalupana'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Paula Oriente',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Paula Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Santa Paula Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2692
              AND col.name = 'Santa Paula Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Pedregal',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Pedregal' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'El Pedregal' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2692
              AND col.name = 'El Pedregal'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Aurora Sur',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Aurora Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'La Aurora Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2692
              AND col.name = 'La Aurora Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Punta',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Punta' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'La Punta' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3740
              AND col.name = 'La Punta'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Francisco de la Soledad',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Francisco de la Soledad' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'San Francisco de la Soledad' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3740
              AND col.name = 'San Francisco de la Soledad'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Luis Gonzaga',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Luis Gonzaga' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'San Luis Gonzaga' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3740
              AND col.name = 'San Luis Gonzaga'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Luis Gonzaga',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Luis Gonzaga' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'San Luis Gonzaga' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3741
              AND col.name = 'San Luis Gonzaga'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Sillita',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Sillita' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'La Sillita' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3741
              AND col.name = 'La Sillita'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Bajío',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Bajío' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'El Bajío' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3741
              AND col.name = 'El Bajío'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Paula San Martín',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Paula San Martín' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Santa Paula San Martín' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3742
              AND col.name = 'Santa Paula San Martín'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de Santa Paula',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de Santa Paula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Lomas de Santa Paula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3742
              AND col.name = 'Lomas de Santa Paula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jauja Oriente',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jauja Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'Jauja Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3743
              AND col.name = 'Jauja Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rinconada de Jauja',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rinconada de Jauja' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'Rinconada de Jauja' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3743
              AND col.name = 'Rinconada de Jauja'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Severiana Sur',
                '45422',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Severiana Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45422' WHERE name = 'La Severiana Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3744
              AND col.name = 'La Severiana Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de Santa Paula',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de Santa Paula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Paseos de Santa Paula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3744
              AND col.name = 'Paseos de Santa Paula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Paula Ampliación',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Paula Ampliación' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'Santa Paula Ampliación' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3745
              AND col.name = 'Santa Paula Ampliación'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Mirador de Santa Paula',
                '45420',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Mirador de Santa Paula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45420' WHERE name = 'El Mirador de Santa Paula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3745
              AND col.name = 'El Mirador de Santa Paula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coyula Centro',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coyula Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Coyula Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2687
              AND col.name = 'Coyula Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Gaspar de las Flores',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Gaspar de las Flores' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San Gaspar de las Flores' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2687
              AND col.name = 'San Gaspar de las Flores'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Cofradía',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Cofradía' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'La Cofradía' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2688
              AND col.name = 'La Cofradía'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San José de las Flores',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San José de las Flores' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San José de las Flores' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2688
              AND col.name = 'San José de las Flores'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coyula Norte',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coyula Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Coyula Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2706
              AND col.name = 'Coyula Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Isabel',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Isabel' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Santa Isabel' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2706
              AND col.name = 'Santa Isabel'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Pocitos',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Pocitos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Los Pocitos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2724
              AND col.name = 'Los Pocitos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Gaspar Oriente',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Gaspar Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San Gaspar Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2724
              AND col.name = 'San Gaspar Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coyula Sur',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coyula Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Coyula Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2725
              AND col.name = 'Coyula Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Potrero de San José',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Potrero de San José' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Potrero de San José' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2725
              AND col.name = 'Potrero de San José'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas del Sol',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas del Sol' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Villas del Sol' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3800
              AND col.name = 'Villas del Sol'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colinas del Rey',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colinas del Rey' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Colinas del Rey' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3800
              AND col.name = 'Colinas del Rey'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de San Gaspar',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Paseos de San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3801
              AND col.name = 'Paseos de San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Bonita Coyula',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Bonita Coyula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Loma Bonita Coyula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3801
              AND col.name = 'Loma Bonita Coyula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Cofradía Norte',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Cofradía Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'La Cofradía Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3802
              AND col.name = 'La Cofradía Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Gaspar Tradicional',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Gaspar Tradicional' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San Gaspar Tradicional' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3802
              AND col.name = 'San Gaspar Tradicional'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coyula Los Arcos',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coyula Los Arcos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Coyula Los Arcos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3803
              AND col.name = 'Coyula Los Arcos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Cerrito Coyula',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Cerrito Coyula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'El Cerrito Coyula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3803
              AND col.name = 'El Cerrito Coyula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Gaspar Poniente',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Gaspar Poniente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San Gaspar Poniente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3804
              AND col.name = 'San Gaspar Poniente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Loma Coyula',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Loma Coyula' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'La Loma Coyula' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3804
              AND col.name = 'La Loma Coyula'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coyula Oriente',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coyula Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Coyula Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3805
              AND col.name = 'Coyula Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de la Cofradía',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de la Cofradía' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Paseos de la Cofradía' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3805
              AND col.name = 'Paseos de la Cofradía'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San José de las Flores Norte',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San José de las Flores Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'San José de las Flores Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3806
              AND col.name = 'San José de las Flores Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas de San Gaspar',
                '45410',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas de San Gaspar' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45410' WHERE name = 'Villas de San Gaspar' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3806
              AND col.name = 'Villas de San Gaspar'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Puente Grande',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Puente Grande' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'Puente Grande' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2689
              AND col.name = 'Puente Grande'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tololotlán',
                '45428',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tololotlán' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45428' WHERE name = 'Tololotlán' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2689
              AND col.name = 'Tololotlán'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ribera del Río Santiago',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ribera del Río Santiago' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'Ribera del Río Santiago' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2689
              AND col.name = 'Ribera del Río Santiago'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Vado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Vado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'El Vado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2690
              AND col.name = 'El Vado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Pinar de las Palomas',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Pinar de las Palomas' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Pinar de las Palomas' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2690
              AND col.name = 'Pinar de las Palomas'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Miguel de la Punta',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Miguel de la Punta' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'San Miguel de la Punta' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2691
              AND col.name = 'San Miguel de la Punta'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda del Real',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda del Real' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Hacienda del Real' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2691
              AND col.name = 'Hacienda del Real'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Matatlán',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Matatlán' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Matatlán' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3861
              AND col.name = 'Matatlán'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Puerta del Vado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Puerta del Vado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'La Puerta del Vado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3861
              AND col.name = 'La Puerta del Vado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda Los Ramos',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda Los Ramos' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Hacienda Los Ramos' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3862
              AND col.name = 'Hacienda Los Ramos'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Álamos Tonalá',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Álamos Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Los Álamos Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3862
              AND col.name = 'Los Álamos Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tololotlán Centro',
                '45428',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tololotlán Centro' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45428' WHERE name = 'Tololotlán Centro' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3863
              AND col.name = 'Tololotlán Centro'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Puente Histórico',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Puente Histórico' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'El Puente Histórico' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3863
              AND col.name = 'El Puente Histórico'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Vado Norte',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Vado Norte' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'El Vado Norte' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3864
              AND col.name = 'El Vado Norte'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos del Vado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos del Vado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Paseos del Vado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3864
              AND col.name = 'Paseos del Vado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Puente Grande Oriente',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Puente Grande Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'Puente Grande Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3865
              AND col.name = 'Puente Grande Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Presa Puente Grande',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Presa Puente Grande' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'La Presa Puente Grande' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3865
              AND col.name = 'La Presa Puente Grande'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Cañadas del Sol',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Cañadas del Sol' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Cañadas del Sol' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3866
              AND col.name = 'Cañadas del Sol'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas del Vado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas del Vado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Villas del Vado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3866
              AND col.name = 'Villas del Vado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Bosques de Tonalá',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Bosques de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Bosques de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3867
              AND col.name = 'Bosques de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jardines del Prado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jardines del Prado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Jardines del Prado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3867
              AND col.name = 'Jardines del Prado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Real del Sol',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Real del Sol' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Real del Sol' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3868
              AND col.name = 'Real del Sol'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colinas de Tonalá',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colinas de Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Colinas de Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3868
              AND col.name = 'Colinas de Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de San Miguel',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de San Miguel' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Lomas de San Miguel' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3869
              AND col.name = 'Lomas de San Miguel'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Palmas Tonalá',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Palmas Tonalá' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Las Palmas Tonalá' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3869
              AND col.name = 'Las Palmas Tonalá'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Parque Industrial El Vado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Parque Industrial El Vado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Parque Industrial El Vado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3870
              AND col.name = 'Parque Industrial El Vado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Vado Sur',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Vado Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'El Vado Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3870
              AND col.name = 'El Vado Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Puente Grande Sur',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Puente Grande Sur' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'Puente Grande Sur' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3871
              AND col.name = 'Puente Grande Sur'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Molino',
                '45427',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Molino' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45427' WHERE name = 'El Molino' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3871
              AND col.name = 'El Molino'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tololotlán Oriente',
                '45428',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tololotlán Oriente' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45428' WHERE name = 'Tololotlán Oriente' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3872
              AND col.name = 'Tololotlán Oriente'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Joya',
                '45428',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Joya' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45428' WHERE name = 'La Joya' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3872
              AND col.name = 'La Joya'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Miguel del Vado',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Miguel del Vado' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'San Miguel del Vado' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3873
              AND col.name = 'San Miguel del Vado'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Fraccionamiento La Loma',
                '45425',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Fraccionamiento La Loma' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45425' WHERE name = 'Fraccionamiento La Loma' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3873
              AND col.name = 'Fraccionamiento La Loma'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Límite Tonalá - Tlaquepaque',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Límite Tonalá - Tlaquepaque' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Límite Tonalá - Tlaquepaque' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3311
              AND col.name = 'Límite Tonalá - Tlaquepaque'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda la Laja',
                '45418',
                'Tonalá',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda la Laja' AND municipality = 'Tonalá'
            );
            UPDATE colonies SET postal_code = '45418' WHERE name = 'Hacienda la Laja' AND municipality = 'Tonalá';
            

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 3311
              AND col.name = 'Hacienda la Laja'
              AND col.municipality = 'Tonalá'
              AND NOT EXISTS (
                  SELECT 1 FROM section_colonies sc2 
                  WHERE sc2.section_id = es.id AND sc2.colony_id = col.id
              );
            
-- === METROPOLITAN JALISCO COLONIES ===

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Americana',
                '44160',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Americana' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44160' WHERE name = 'Americana' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Providencia',
                '44630',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Providencia' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44630' WHERE name = 'Providencia' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Centro de Guadalajara',
                '44100',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Centro de Guadalajara' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44100' WHERE name = 'Centro de Guadalajara' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ladrón de Guevara',
                '44600',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ladrón de Guevara' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44600' WHERE name = 'Ladrón de Guevara' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Oblatos',
                '44700',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Oblatos' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44700' WHERE name = 'Oblatos' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Teresita',
                '44600',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Teresita' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44600' WHERE name = 'Santa Teresita' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Chapultepec',
                '44160',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Chapultepec' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44160' WHERE name = 'Chapultepec' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Huentitán el Alto',
                '44390',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Huentitán el Alto' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44390' WHERE name = 'Huentitán el Alto' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Huentitán el Bajo',
                '44398',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Huentitán el Bajo' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44398' WHERE name = 'Huentitán el Bajo' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Miravalle',
                '44990',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Miravalle' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44990' WHERE name = 'Miravalle' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Moderna',
                '44190',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Moderna' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44190' WHERE name = 'Moderna' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Monraz',
                '44670',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Monraz' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44670' WHERE name = 'Monraz' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Independencia',
                '44290',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Independencia' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44290' WHERE name = 'Independencia' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Atlas',
                '44870',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Atlas' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44870' WHERE name = 'Atlas' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Conchas',
                '44460',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Conchas' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44460' WHERE name = 'Las Conchas' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Juan de Dios',
                '44360',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Juan de Dios' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44360' WHERE name = 'San Juan de Dios' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cecilia',
                '44700',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cecilia' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44700' WHERE name = 'Santa Cecilia' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tetlán',
                '44820',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tetlán' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44820' WHERE name = 'Tetlán' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Rancho Nuevo',
                '44240',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Rancho Nuevo' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44240' WHERE name = 'Rancho Nuevo' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jardines de la Paz',
                '44860',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jardines de la Paz' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44860' WHERE name = 'Jardines de la Paz' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jardines Alcalde',
                '44298',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jardines Alcalde' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44298' WHERE name = 'Jardines Alcalde' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Colinas de la Normal',
                '44270',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Colinas de la Normal' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44270' WHERE name = 'Colinas de la Normal' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Circunvalación Vallarta',
                '44680',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Circunvalación Vallarta' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44680' WHERE name = 'Circunvalación Vallarta' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de Polanco',
                '44960',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de Polanco' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44960' WHERE name = 'Lomas de Polanco' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Del Fresno',
                '44900',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Del Fresno' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44900' WHERE name = 'Del Fresno' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Echeverría',
                '44970',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Echeverría' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44970' WHERE name = 'Echeverría' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Onofre',
                '44750',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Onofre' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44750' WHERE name = 'San Onofre' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Talpita',
                '44710',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Talpita' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44710' WHERE name = 'Talpita' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Andrés',
                '44810',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Andrés' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44810' WHERE name = 'San Andrés' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Retiro',
                '44280',
                'Guadalajara',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Retiro' AND municipality = 'Guadalajara'
            );
            UPDATE colonies SET postal_code = '44280' WHERE name = 'El Retiro' AND municipality = 'Guadalajara';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Puerta de Hierro',
                '45116',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Puerta de Hierro' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45116' WHERE name = 'Puerta de Hierro' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Valle Real',
                '45019',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Valle Real' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45019' WHERE name = 'Valle Real' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ciudad Granja',
                '45010',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ciudad Granja' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45010' WHERE name = 'Ciudad Granja' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Chapalita',
                '45040',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Chapalita' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45040' WHERE name = 'Chapalita' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Águilas',
                '45080',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Águilas' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45080' WHERE name = 'Las Águilas' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tabachines',
                '45188',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tabachines' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45188' WHERE name = 'Tabachines' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Colli Urbano',
                '45070',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Colli Urbano' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45070' WHERE name = 'El Colli Urbano' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Arboledas',
                '45070',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Arboledas' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45070' WHERE name = 'Arboledas' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Margarita',
                '45140',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Margarita' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45140' WHERE name = 'Santa Margarita' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Constitución',
                '45180',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Constitución' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45180' WHERE name = 'Constitución' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Estancia',
                '45030',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Estancia' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45030' WHERE name = 'La Estancia' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Jardines Universidad',
                '45110',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Jardines Universidad' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45110' WHERE name = 'Jardines Universidad' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Altagracia',
                '45130',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Altagracia' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45130' WHERE name = 'Altagracia' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tesistán',
                '45200',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tesistán' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45200' WHERE name = 'Tesistán' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos del Sol',
                '45079',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos del Sol' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45079' WHERE name = 'Paseos del Sol' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Calma',
                '45070',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Calma' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45070' WHERE name = 'La Calma' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Vigía',
                '45140',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Vigía' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45140' WHERE name = 'El Vigía' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Juan de Ocotán',
                '45019',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Juan de Ocotán' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45019' WHERE name = 'San Juan de Ocotán' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Nuevo México',
                '45138',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Nuevo México' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45138' WHERE name = 'Nuevo México' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Mesa de los Ochoterena',
                '45180',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Mesa de los Ochoterena' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45180' WHERE name = 'Mesa de los Ochoterena' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Residencial Moctezuma',
                '45059',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Residencial Moctezuma' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45059' WHERE name = 'Residencial Moctezuma' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas Verdes',
                '45060',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas Verdes' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45060' WHERE name = 'Lomas Verdes' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Miramar',
                '45060',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Miramar' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45060' WHERE name = 'Miramar' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Arenales Tapatíos',
                '45066',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Arenales Tapatíos' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45066' WHERE name = 'Arenales Tapatíos' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Villas de Guadalupe',
                '45180',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Villas de Guadalupe' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45180' WHERE name = 'Villas de Guadalupe' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Venta del Astillero',
                '45221',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Venta del Astillero' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45221' WHERE name = 'La Venta del Astillero' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Nextipac',
                '45220',
                'Zapopan',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Nextipac' AND municipality = 'Zapopan'
            );
            UPDATE colonies SET postal_code = '45220' WHERE name = 'Nextipac' AND municipality = 'Zapopan';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tlaquepaque Centro',
                '45500',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tlaquepaque Centro' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45500' WHERE name = 'Tlaquepaque Centro' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Anita',
                '45600',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Anita' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45600' WHERE name = 'Santa Anita' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Juntas',
                '45590',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Juntas' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45590' WHERE name = 'Las Juntas' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Vergel',
                '45595',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Vergel' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45595' WHERE name = 'El Vergel' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Pedrito',
                '45625',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Pedrito' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45625' WHERE name = 'San Pedrito' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa María Tequepexpan',
                '45601',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa María Tequepexpan' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45601' WHERE name = 'Santa María Tequepexpan' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Martín de las Flores',
                '45629',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Martín de las Flores' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45629' WHERE name = 'San Martín de las Flores' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Olivos',
                '45610',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Olivos' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45610' WHERE name = 'Los Olivos' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Parques del Bosque',
                '45609',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Parques del Bosque' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45609' WHERE name = 'Parques del Bosque' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Loma Bonita Ejidal',
                '45608',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Loma Bonita Ejidal' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45608' WHERE name = 'Loma Bonita Ejidal' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Balcones de Santa María',
                '45606',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Balcones de Santa María' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45606' WHERE name = 'Balcones de Santa María' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Tapatío',
                '45588',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Tapatío' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45588' WHERE name = 'El Tapatío' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Ladrillera',
                '45570',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Ladrillera' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45570' WHERE name = 'La Ladrillera' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Buenos Aires',
                '45602',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Buenos Aires' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45602' WHERE name = 'Buenos Aires' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Mirasierra',
                '45605',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Mirasierra' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45605' WHERE name = 'Mirasierra' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Guayabitos',
                '45607',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Guayabitos' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45607' WHERE name = 'Guayabitos' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Artesanos',
                '45598',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Artesanos' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45598' WHERE name = 'Artesanos' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Mezquitera',
                '45615',
                'San Pedro Tlaquepaque',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Mezquitera' AND municipality = 'San Pedro Tlaquepaque'
            );
            UPDATE colonies SET postal_code = '45615' WHERE name = 'La Mezquitera' AND municipality = 'San Pedro Tlaquepaque';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda Santa Fe',
                '45653',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda Santa Fe' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45653' WHERE name = 'Hacienda Santa Fe' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Chulavista',
                '45655',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Chulavista' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45655' WHERE name = 'Chulavista' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Cántaros',
                '45655',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Cántaros' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45655' WHERE name = 'Los Cántaros' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Agustín',
                '45645',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Agustín' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45645' WHERE name = 'San Agustín' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Tijera',
                '45645',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Tijera' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45645' WHERE name = 'La Tijera' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Hacienda Santa Cruz',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Hacienda Santa Cruz' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'Hacienda Santa Cruz' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tulipanes',
                '45647',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tulipanes' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45647' WHERE name = 'Tulipanes' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas del Sur',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas del Sur' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'Lomas del Sur' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Manantial',
                '45645',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Manantial' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45645' WHERE name = 'El Manantial' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Tlajomulco Centro',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Tlajomulco Centro' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'Tlajomulco Centro' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Sebastián el Grande',
                '45650',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Sebastián el Grande' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45650' WHERE name = 'San Sebastián el Grande' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Miguel Cuyutlán',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Miguel Cuyutlán' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'San Miguel Cuyutlán' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz de las Flores',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz de las Flores' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'Santa Cruz de las Flores' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lomas de Tejeda',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lomas de Tejeda' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'Lomas de Tejeda' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Cajititlán',
                '45640',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Cajititlán' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45640' WHERE name = 'Cajititlán' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Palomar',
                '45643',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Palomar' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45643' WHERE name = 'El Palomar' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Club de Golf Santa Anita',
                '45645',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Club de Golf Santa Anita' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45645' WHERE name = 'Club de Golf Santa Anita' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Gavilanes',
                '45645',
                'Tlajomulco de Zúñiga',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Gavilanes' AND municipality = 'Tlajomulco de Zúñiga'
            );
            UPDATE colonies SET postal_code = '45645' WHERE name = 'Los Gavilanes' AND municipality = 'Tlajomulco de Zúñiga';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Pintas',
                '45690',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Pintas' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45690' WHERE name = 'Las Pintas' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Pintitas',
                '45693',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Pintitas' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45693' WHERE name = 'Las Pintitas' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San José del Castillo',
                '45685',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San José del Castillo' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45685' WHERE name = 'San José del Castillo' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Salto Centro',
                '45680',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Salto Centro' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45680' WHERE name = 'El Salto Centro' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Quince',
                '45696',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Quince' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45696' WHERE name = 'El Quince' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Huizachera',
                '45687',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Huizachera' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45687' WHERE name = 'La Huizachera' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Azucena',
                '45680',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Azucena' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45680' WHERE name = 'La Azucena' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San José de las Pintas',
                '45690',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San José de las Pintas' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45690' WHERE name = 'San José de las Pintas' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Castillo Chico',
                '45685',
                'El Salto',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Castillo Chico' AND municipality = 'El Salto'
            );
            UPDATE colonies SET postal_code = '45685' WHERE name = 'Castillo Chico' AND municipality = 'El Salto';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zona Hotelera Norte',
                '48333',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zona Hotelera Norte' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48333' WHERE name = 'Zona Hotelera Norte' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Marina Vallarta',
                '48354',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Marina Vallarta' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48354' WHERE name = 'Marina Vallarta' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Fluvial Vallarta',
                '48312',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Fluvial Vallarta' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48312' WHERE name = 'Fluvial Vallarta' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                '5 de Diciembre',
                '48350',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = '5 de Diciembre' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48350' WHERE name = '5 de Diciembre' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Emiliano Zapata',
                '48380',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Emiliano Zapata' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48380' WHERE name = 'Emiliano Zapata' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Pitillal',
                '48290',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Pitillal' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48290' WHERE name = 'El Pitillal' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Aralias',
                '48328',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Aralias' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48328' WHERE name = 'Las Aralias' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Versalles',
                '48310',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Versalles' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48310' WHERE name = 'Versalles' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ixtapa Vallarta',
                '48280',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ixtapa Vallarta' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48280' WHERE name = 'Ixtapa Vallarta' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Juntas',
                '48291',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Juntas' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48291' WHERE name = 'Las Juntas' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Coapinole',
                '48290',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Coapinole' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48290' WHERE name = 'Coapinole' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Mojoneras',
                '48290',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Mojoneras' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48290' WHERE name = 'Mojoneras' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Centro de Puerto Vallarta',
                '48300',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Centro de Puerto Vallarta' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48300' WHERE name = 'Centro de Puerto Vallarta' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Conchas Chinas',
                '48390',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Conchas Chinas' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48390' WHERE name = 'Conchas Chinas' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Mismaloya',
                '48294',
                'Puerto Vallarta',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Mismaloya' AND municipality = 'Puerto Vallarta'
            );
            UPDATE colonies SET postal_code = '48294' WHERE name = 'Mismaloya' AND municipality = 'Puerto Vallarta';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Zapotlanejo Centro',
                '45430',
                'Zapotlanejo',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Zapotlanejo Centro' AND municipality = 'Zapotlanejo'
            );
            UPDATE colonies SET postal_code = '45430' WHERE name = 'Zapotlanejo Centro' AND municipality = 'Zapotlanejo';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Purísima',
                '45430',
                'Zapotlanejo',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Purísima' AND municipality = 'Zapotlanejo'
            );
            UPDATE colonies SET postal_code = '45430' WHERE name = 'La Purísima' AND municipality = 'Zapotlanejo';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Fe',
                '45430',
                'Zapotlanejo',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Fe' AND municipality = 'Zapotlanejo'
            );
            UPDATE colonies SET postal_code = '45430' WHERE name = 'Santa Fe' AND municipality = 'Zapotlanejo';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San José de las Flores',
                '45435',
                'Zapotlanejo',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San José de las Flores' AND municipality = 'Zapotlanejo'
            );
            UPDATE colonies SET postal_code = '45435' WHERE name = 'San José de las Flores' AND municipality = 'Zapotlanejo';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Matatlán',
                '45430',
                'Zapotlanejo',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Matatlán' AND municipality = 'Zapotlanejo'
            );
            UPDATE colonies SET postal_code = '45430' WHERE name = 'Matatlán' AND municipality = 'Zapotlanejo';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Loma',
                '45430',
                'Zapotlanejo',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Loma' AND municipality = 'Zapotlanejo'
            );
            UPDATE colonies SET postal_code = '45430' WHERE name = 'La Loma' AND municipality = 'Zapotlanejo';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Chapala Centro',
                '45900',
                'Chapala',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Chapala Centro' AND municipality = 'Chapala'
            );
            UPDATE colonies SET postal_code = '45900' WHERE name = 'Chapala Centro' AND municipality = 'Chapala';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ajijic',
                '45920',
                'Chapala',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ajijic' AND municipality = 'Chapala'
            );
            UPDATE colonies SET postal_code = '45920' WHERE name = 'Ajijic' AND municipality = 'Chapala';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Antonio Tlayacapan',
                '45922',
                'Chapala',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Antonio Tlayacapan' AND municipality = 'Chapala'
            );
            UPDATE colonies SET postal_code = '45922' WHERE name = 'San Antonio Tlayacapan' AND municipality = 'Chapala';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Cruz de la Soledad',
                '45908',
                'Chapala',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Cruz de la Soledad' AND municipality = 'Chapala'
            );
            UPDATE colonies SET postal_code = '45908' WHERE name = 'Santa Cruz de la Soledad' AND municipality = 'Chapala';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Nicolás de Ibarra',
                '45915',
                'Chapala',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Nicolás de Ibarra' AND municipality = 'Chapala'
            );
            UPDATE colonies SET postal_code = '45915' WHERE name = 'San Nicolás de Ibarra' AND municipality = 'Chapala';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Riberas del Pilar',
                '45900',
                'Chapala',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Riberas del Pilar' AND municipality = 'Chapala'
            );
            UPDATE colonies SET postal_code = '45900' WHERE name = 'Riberas del Pilar' AND municipality = 'Chapala';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ixtlahuacán Centro',
                '45850',
                'Ixtlahuacán de los Membrillos',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ixtlahuacán Centro' AND municipality = 'Ixtlahuacán de los Membrillos'
            );
            UPDATE colonies SET postal_code = '45850' WHERE name = 'Ixtlahuacán Centro' AND municipality = 'Ixtlahuacán de los Membrillos';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Atequiza',
                '45870',
                'Ixtlahuacán de los Membrillos',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Atequiza' AND municipality = 'Ixtlahuacán de los Membrillos'
            );
            UPDATE colonies SET postal_code = '45870' WHERE name = 'Atequiza' AND municipality = 'Ixtlahuacán de los Membrillos';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Los Olivos',
                '45850',
                'Ixtlahuacán de los Membrillos',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Los Olivos' AND municipality = 'Ixtlahuacán de los Membrillos'
            );
            UPDATE colonies SET postal_code = '45850' WHERE name = 'Los Olivos' AND municipality = 'Ixtlahuacán de los Membrillos';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Huerta',
                '45850',
                'Ixtlahuacán de los Membrillos',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Huerta' AND municipality = 'Ixtlahuacán de los Membrillos'
            );
            UPDATE colonies SET postal_code = '45850' WHERE name = 'La Huerta' AND municipality = 'Ixtlahuacán de los Membrillos';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Valle de los Sabinos',
                '45850',
                'Ixtlahuacán de los Membrillos',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Valle de los Sabinos' AND municipality = 'Ixtlahuacán de los Membrillos'
            );
            UPDATE colonies SET postal_code = '45850' WHERE name = 'Valle de los Sabinos' AND municipality = 'Ixtlahuacán de los Membrillos';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Buenavista',
                '45850',
                'Ixtlahuacán de los Membrillos',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Buenavista' AND municipality = 'Ixtlahuacán de los Membrillos'
            );
            UPDATE colonies SET postal_code = '45850' WHERE name = 'Buenavista' AND municipality = 'Ixtlahuacán de los Membrillos';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Lagos de Moreno Centro',
                '47400',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Lagos de Moreno Centro' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47400' WHERE name = 'Lagos de Moreno Centro' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'La Luz',
                '47420',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'La Luz' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47420' WHERE name = 'La Luz' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'El Refugio',
                '47410',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'El Refugio' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47410' WHERE name = 'El Refugio' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'San Miguel',
                '47400',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'San Miguel' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47400' WHERE name = 'San Miguel' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Alcaldes',
                '47430',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Alcaldes' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47430' WHERE name = 'Alcaldes' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Cristeros',
                '47470',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Cristeros' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47470' WHERE name = 'Cristeros' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Paseos de la Montaña',
                '47460',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Paseos de la Montaña' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47460' WHERE name = 'Paseos de la Montaña' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Cañada Rica',
                '47480',
                'Lagos de Moreno',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Cañada Rica' AND municipality = 'Lagos de Moreno'
            );
            UPDATE colonies SET postal_code = '47480' WHERE name = 'Cañada Rica' AND municipality = 'Lagos de Moreno';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Ciudad Guzmán Centro',
                '49000',
                'Zapotlán el Grande',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Ciudad Guzmán Centro' AND municipality = 'Zapotlán el Grande'
            );
            UPDATE colonies SET postal_code = '49000' WHERE name = 'Ciudad Guzmán Centro' AND municipality = 'Zapotlán el Grande';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Las Peñas',
                '49010',
                'Zapotlán el Grande',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Las Peñas' AND municipality = 'Zapotlán el Grande'
            );
            UPDATE colonies SET postal_code = '49010' WHERE name = 'Las Peñas' AND municipality = 'Zapotlán el Grande';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Solidaridad',
                '49020',
                'Zapotlán el Grande',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Solidaridad' AND municipality = 'Zapotlán el Grande'
            );
            UPDATE colonies SET postal_code = '49020' WHERE name = 'Solidaridad' AND municipality = 'Zapotlán el Grande';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Constitución',
                '49050',
                'Zapotlán el Grande',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Constitución' AND municipality = 'Zapotlán el Grande'
            );
            UPDATE colonies SET postal_code = '49050' WHERE name = 'Constitución' AND municipality = 'Zapotlán el Grande';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Santa Rosa',
                '49070',
                'Zapotlán el Grande',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Santa Rosa' AND municipality = 'Zapotlán el Grande'
            );
            UPDATE colonies SET postal_code = '49070' WHERE name = 'Santa Rosa' AND municipality = 'Zapotlán el Grande';
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status, version)
            SELECT 
                gen_random_uuid(),
                (SELECT id FROM catalog_versions LIMIT 1),
                'Providencia',
                '49080',
                'Zapotlán el Grande',
                'active',
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM colonies WHERE name = 'Providencia' AND municipality = 'Zapotlán el Grande'
            );
            UPDATE colonies SET postal_code = '49080' WHERE name = 'Providencia' AND municipality = 'Zapotlán el Grande';
            
COMMIT;