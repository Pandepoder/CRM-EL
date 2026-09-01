-- ========================================================
-- REAL & OFFICIAL TONALÁ ELECTORAL CARTOGRAPHY SYNC
-- ========================================================
BEGIN;


    -- Clean up orphaned references or dummy test sections outside Tonala
    DELETE FROM section_colonies WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2704, 2714, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2693, 2694, 2695, 2698, 2699, 2700, 2701, 2702, 2705, 2707, 2726, 2727, 2728, 2729, 2760, 2761, 2709, 2710, 2711, 2733, 2734, 2735, 2736, 2737, 2743, 2744, 2745, 2751, 2752, 2708, 2730, 2731, 2732, 2765, 2683, 2684, 2685, 2686, 2692, 2740, 2741, 2687, 2688, 2706, 2724, 2725, 2742, 2770, 2689, 2690, 2691, 2753, 2754, 2746, 2747, 2748, 2749, 2750, 2755, 2756)
    );
    DELETE FROM contacts WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2704, 2714, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2693, 2694, 2695, 2698, 2699, 2700, 2701, 2702, 2705, 2707, 2726, 2727, 2728, 2729, 2760, 2761, 2709, 2710, 2711, 2733, 2734, 2735, 2736, 2737, 2743, 2744, 2745, 2751, 2752, 2708, 2730, 2731, 2732, 2765, 2683, 2684, 2685, 2686, 2692, 2740, 2741, 2687, 2688, 2706, 2724, 2725, 2742, 2770, 2689, 2690, 2691, 2753, 2754, 2746, 2747, 2748, 2749, 2750, 2755, 2756)
    );
    DELETE FROM event_reports WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2704, 2714, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2693, 2694, 2695, 2698, 2699, 2700, 2701, 2702, 2705, 2707, 2726, 2727, 2728, 2729, 2760, 2761, 2709, 2710, 2711, 2733, 2734, 2735, 2736, 2737, 2743, 2744, 2745, 2751, 2752, 2708, 2730, 2731, 2732, 2765, 2683, 2684, 2685, 2686, 2692, 2740, 2741, 2687, 2688, 2706, 2724, 2725, 2742, 2770, 2689, 2690, 2691, 2753, 2754, 2746, 2747, 2748, 2749, 2750, 2755, 2756)
    );
    DELETE FROM electoral_representatives WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2704, 2714, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2693, 2694, 2695, 2698, 2699, 2700, 2701, 2702, 2705, 2707, 2726, 2727, 2728, 2729, 2760, 2761, 2709, 2710, 2711, 2733, 2734, 2735, 2736, 2737, 2743, 2744, 2745, 2751, 2752, 2708, 2730, 2731, 2732, 2765, 2683, 2684, 2685, 2686, 2692, 2740, 2741, 2687, 2688, 2706, 2724, 2725, 2742, 2770, 2689, 2690, 2691, 2753, 2754, 2746, 2747, 2748, 2749, 2750, 2755, 2756)
    );
    DELETE FROM electoral_sections WHERE section_num NOT IN (2704, 2714, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2693, 2694, 2695, 2698, 2699, 2700, 2701, 2702, 2705, 2707, 2726, 2727, 2728, 2729, 2760, 2761, 2709, 2710, 2711, 2733, 2734, 2735, 2736, 2737, 2743, 2744, 2745, 2751, 2752, 2708, 2730, 2731, 2732, 2765, 2683, 2684, 2685, 2686, 2692, 2740, 2741, 2687, 2688, 2706, 2724, 2725, 2742, 2770, 2689, 2690, 2691, 2753, 2754, 2746, 2747, 2748, 2749, 2750, 2755, 2756);
    

    INSERT INTO catalog_versions (id, catalog_type, source_name, source_version)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'ine_sections', 'iepc_jalisco_official_2026', 'v2.0')
    ON CONFLICT (id) DO NOTHING;
    

        -- Sección #2704 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2704, '{"type": "Polygon", "coordinates": [[[-103.23825, 20.622], [-103.23975, 20.631], [-103.244, 20.631], [-103.247, 20.628], [-103.244, 20.621], [-103.23975, 20.621], [-103.23825, 20.622]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Centro de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704 
              AND col.name = 'Centro de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Alfareros', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704 
              AND col.name = 'Alfareros' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Cihualpilli', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2704 
              AND col.name = 'Cihualpilli' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2714 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2714, '{"type": "Polygon", "coordinates": [[[-103.247, 20.618], [-103.246207, 20.61615], [-103.237701, 20.608707], [-103.23975, 20.621], [-103.244, 20.621], [-103.247, 20.618]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Barrio Nuevo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2714 
              AND col.name = 'Barrio Nuevo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              '20 de Noviembre', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2714 
              AND col.name = '20 de Noviembre' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Pachaguilla', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2714 
              AND col.name = 'Pachaguilla' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2716 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2716, '{"type": "Polygon", "coordinates": [[[-103.247, 20.638], [-103.244, 20.631], [-103.23975, 20.631], [-103.23825, 20.632], [-103.240357, 20.644643], [-103.247, 20.638]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Felipe', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2716 
              AND col.name = 'San Felipe' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Panorámico', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2716 
              AND col.name = 'El Panorámico' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Linda Vista', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2716 
              AND col.name = 'Linda Vista' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2717 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2717, '{"type": "Polygon", "coordinates": [[[-103.237529, 20.608381], [-103.233, 20.608647], [-103.233, 20.622], [-103.23825, 20.622], [-103.23975, 20.621], [-103.237701, 20.608707], [-103.237529, 20.608381]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Tonalá Centro Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2717 
              AND col.name = 'Tonalá Centro Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Encinos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2717 
              AND col.name = 'Los Encinos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Silos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2717 
              AND col.name = 'Los Silos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2718 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2718, '{"type": "Polygon", "coordinates": [[[-103.233, 20.622], [-103.233, 20.632], [-103.23825, 20.632], [-103.23975, 20.631], [-103.23825, 20.622], [-103.233, 20.622]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Cruz Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2718 
              AND col.name = 'Santa Cruz Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Manantial', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2718 
              AND col.name = 'Lomas del Manantial' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2719 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2719, '{"type": "Polygon", "coordinates": [[[-103.237299, 20.648814], [-103.238087, 20.648586], [-103.238808, 20.648], [-103.240357, 20.644644], [-103.23825, 20.632], [-103.233, 20.632], [-103.233, 20.632], [-103.233, 20.64604], [-103.237299, 20.648814]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Jagüey', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2719 
              AND col.name = 'El Jagüey' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Cuchara', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2719 
              AND col.name = 'La Cuchara' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Cerro del Rey', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2719 
              AND col.name = 'Cerro del Rey' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2720 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2720, '{"type": "Polygon", "coordinates": [[[-103.222132, 20.621124], [-103.22365, 20.622], [-103.233, 20.622], [-103.233, 20.622], [-103.233, 20.608647], [-103.22836, 20.607283], [-103.222132, 20.621124]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Crucero', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2720 
              AND col.name = 'El Crucero' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Tierras Blancas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2720 
              AND col.name = 'Tierras Blancas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2721 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2721, '{"type": "Polygon", "coordinates": [[[-103.22765, 20.632], [-103.233, 20.632], [-103.233, 20.632], [-103.233, 20.622], [-103.233, 20.622], [-103.22365, 20.622], [-103.22765, 20.632]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Mesita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2721 
              AND col.name = 'La Mesita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Zalate Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2721 
              AND col.name = 'El Zalate Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2722 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2722, '{"type": "Polygon", "coordinates": [[[-103.22135, 20.63875], [-103.230741, 20.645457], [-103.233, 20.64604], [-103.233, 20.632], [-103.233, 20.632], [-103.22765, 20.632], [-103.22135, 20.63875]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Soledad', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2722 
              AND col.name = 'La Soledad' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Nicolás', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2722 
              AND col.name = 'San Nicolás' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2693 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2693, '{"type": "Polygon", "coordinates": [[[-103.2565, 20.64675], [-103.258167, 20.648], [-103.27121, 20.648], [-103.27289, 20.64625], [-103.26926, 20.638], [-103.2565, 20.638], [-103.2565, 20.64675]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Delegación A', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2693 
              AND col.name = 'Loma Dorada Delegación A' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de la Cañada', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2693 
              AND col.name = 'Paseos de la Cañada' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2694 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2694, '{"type": "Polygon", "coordinates": [[[-103.263576, 20.657847], [-103.269738, 20.657198], [-103.27121, 20.648], [-103.258167, 20.648], [-103.259691, 20.654859], [-103.263576, 20.657847]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Sección Los Arcos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2694 
              AND col.name = 'Loma Dorada Sección Los Arcos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rincón de la Loma', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2694 
              AND col.name = 'Rincón de la Loma' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2695 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2695, '{"type": "Polygon", "coordinates": [[[-103.270027, 20.61718], [-103.2565, 20.619316], [-103.2565, 20.628], [-103.2565, 20.628], [-103.27046, 20.628], [-103.270027, 20.61718]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Sección Loma Alta', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2695 
              AND col.name = 'Loma Dorada Sección Loma Alta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto del Río', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2695 
              AND col.name = 'Coto del Río' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2698 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2698, '{"type": "Polygon", "coordinates": [[[-103.2565, 20.638], [-103.2565, 20.638], [-103.26926, 20.638], [-103.27214, 20.63], [-103.27046, 20.628], [-103.2565, 20.628], [-103.2565, 20.638]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Delegación B', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2698 
              AND col.name = 'Loma Dorada Delegación B' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas del Palmar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2698 
              AND col.name = 'Villas del Palmar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2699 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2699, '{"type": "Polygon", "coordinates": [[[-103.254, 20.648], [-103.2565, 20.64675], [-103.2565, 20.638], [-103.2565, 20.638], [-103.247, 20.638], [-103.240357, 20.644643], [-103.238808, 20.648], [-103.254, 20.648]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Delegación C', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2699 
              AND col.name = 'Loma Dorada Delegación C' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Misión de la Cantera', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2699 
              AND col.name = 'Misión de la Cantera' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2700 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2700, '{"type": "Polygon", "coordinates": [[[-103.2565, 20.638], [-103.2565, 20.638], [-103.2565, 20.628], [-103.2565, 20.628], [-103.247, 20.628], [-103.244, 20.631], [-103.247, 20.638], [-103.2565, 20.638]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Delegación D', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2700 
              AND col.name = 'Loma Dorada Delegación D' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Bonita Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2700 
              AND col.name = 'Loma Bonita Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2701 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2701, '{"type": "Polygon", "coordinates": [[[-103.247062, 20.657563], [-103.250625, 20.658125], [-103.254, 20.648], [-103.238807, 20.648], [-103.238086, 20.648586], [-103.247062, 20.657563]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Manantial Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2701 
              AND col.name = 'Lomas del Manantial Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2701 
              AND col.name = 'Paseos de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2702 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2702, '{"type": "Polygon", "coordinates": [[[-103.256019, 20.606], [-103.255, 20.605052], [-103.249207, 20.605651], [-103.246207, 20.61615], [-103.247, 20.618], [-103.255574, 20.618], [-103.256019, 20.606]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2702 
              AND col.name = 'Villas de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Fracc. La Providencia', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2702 
              AND col.name = 'Fracc. La Providencia' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2705 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2705, '{"type": "Polygon", "coordinates": [[[-103.2565, 20.628], [-103.2565, 20.628], [-103.2565, 20.619316], [-103.255574, 20.618], [-103.247, 20.618], [-103.244, 20.621], [-103.247, 20.628], [-103.2565, 20.628]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Real de las Lomas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2705 
              AND col.name = 'Real de las Lomas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas de la Soledad', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2705 
              AND col.name = 'Lomas de la Soledad' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2707 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2707, '{"type": "Polygon", "coordinates": [[[-103.253162, 20.660662], [-103.259691, 20.654858], [-103.258167, 20.648], [-103.2565, 20.64675], [-103.254, 20.648], [-103.250625, 20.658125], [-103.253162, 20.660662]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2707 
              AND col.name = 'Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Alamedas de Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2707 
              AND col.name = 'Alamedas de Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Arcos de Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2707 
              AND col.name = 'Arcos de Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2726 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2726, '{"type": "Polygon", "coordinates": [[[-103.250902, 20.67], [-103.254685, 20.67725], [-103.25925, 20.67725], [-103.2665, 20.67], [-103.25975, 20.6655], [-103.254424, 20.6655], [-103.250902, 20.67]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Camichines', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2726 
              AND col.name = 'Los Camichines' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2726 
              AND col.name = 'Zalatitán Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2727 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2727, '{"type": "Polygon", "coordinates": [[[-103.235518, 20.669202], [-103.23675, 20.67325], [-103.23915, 20.67725], [-103.2417, 20.67725], [-103.2504, 20.67], [-103.2423, 20.6655], [-103.23885, 20.6655], [-103.235518, 20.669202]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2727 
              AND col.name = 'Villas de Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Aurora', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2727 
              AND col.name = 'La Aurora' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2728 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2728, '{"type": "Polygon", "coordinates": [[[-103.254424, 20.6655], [-103.25975, 20.6655], [-103.263576, 20.657847], [-103.259691, 20.654858], [-103.253162, 20.660661], [-103.254424, 20.6655]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas de Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2728 
              AND col.name = 'Lomas de Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Mirador de la Reina', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2728 
              AND col.name = 'Mirador de la Reina' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2729 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2729, '{"type": "Polygon", "coordinates": [[[-103.235275, 20.653583], [-103.23885, 20.6655], [-103.2423, 20.6655], [-103.247062, 20.657563], [-103.238086, 20.648586], [-103.237299, 20.648813], [-103.235275, 20.653583]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2729 
              AND col.name = 'Zalatitán Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Francisco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2729 
              AND col.name = 'San Francisco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2760 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2760, '{"type": "Polygon", "coordinates": [[[-103.25925, 20.67725], [-103.254685, 20.67725], [-103.250978, 20.685], [-103.266354, 20.685], [-103.25925, 20.67725]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Huertita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2760 
              AND col.name = 'La Huertita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Zalate', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2760 
              AND col.name = 'Paseos del Zalate' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2761 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2761, '{"type": "Polygon", "coordinates": [[[-103.2417, 20.67725], [-103.23915, 20.67725], [-103.234888, 20.685], [-103.250225, 20.685], [-103.2417, 20.67725]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Linda Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2761 
              AND col.name = 'Loma Linda Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada del Sol', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2761 
              AND col.name = 'Rinconada del Sol' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2709 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2709, '{"type": "Polygon", "coordinates": [[[-103.285, 20.6734], [-103.27125, 20.67615], [-103.27125, 20.685], [-103.285, 20.685], [-103.285, 20.6734]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Límite Periférico', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2709 
              AND col.name = 'Colonia Jalisco Límite Periférico' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Julián', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2709 
              AND col.name = 'San Julián' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2710 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2710, '{"type": "Polygon", "coordinates": [[[-103.27125, 20.67615], [-103.268576, 20.67], [-103.2665, 20.67], [-103.25925, 20.67725], [-103.266354, 20.685], [-103.27125, 20.685], [-103.27125, 20.67615]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección I', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2710 
              AND col.name = 'Colonia Jalisco Sección I' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Educadores Jaliscienses', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2710 
              AND col.name = 'Educadores Jaliscienses' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2711 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2711, '{"type": "Polygon", "coordinates": [[[-103.27125, 20.659517], [-103.27125, 20.666925], [-103.285, 20.6683], [-103.285, 20.657683], [-103.27125, 20.659517]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2711 
              AND col.name = 'Colonia Jalisco Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Misión del Campanario', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2711 
              AND col.name = 'Misión del Campanario' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2733 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2733, '{"type": "Polygon", "coordinates": [[[-103.254685, 20.67725], [-103.250902, 20.67], [-103.2504, 20.67], [-103.2417, 20.67725], [-103.250225, 20.685], [-103.250978, 20.685], [-103.254685, 20.67725]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2733 
              AND col.name = 'Colonia Jalisco Sección II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Perla', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2733 
              AND col.name = 'La Perla' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2734 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2734, '{"type": "Polygon", "coordinates": [[[-103.25975, 20.6655], [-103.2665, 20.67], [-103.268576, 20.67], [-103.27125, 20.666925], [-103.27125, 20.659517], [-103.269739, 20.657199], [-103.263576, 20.657848], [-103.25975, 20.6655]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección III', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2734 
              AND col.name = 'Colonia Jalisco Sección III' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Antonio', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2734 
              AND col.name = 'San Antonio' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2735 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2735, '{"type": "Polygon", "coordinates": [[[-103.2423, 20.6655], [-103.250401, 20.67], [-103.250902, 20.67], [-103.254424, 20.6655], [-103.253162, 20.660662], [-103.250625, 20.658125], [-103.247063, 20.657562], [-103.2423, 20.6655]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección IV', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2735 
              AND col.name = 'Colonia Jalisco Sección IV' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Misión San Francisco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2735 
              AND col.name = 'Misión San Francisco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2736 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2736, '{"type": "Polygon", "coordinates": [[[-103.23915, 20.67725], [-103.23675, 20.67325], [-103.2205, 20.683], [-103.220278, 20.685], [-103.234888, 20.685], [-103.23915, 20.67725]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección V', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2736 
              AND col.name = 'Colonia Jalisco Sección V' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada de San Gaspar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2736 
              AND col.name = 'Rinconada de San Gaspar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2737 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2737, '{"type": "Polygon", "coordinates": [[[-103.2275, 20.658638], [-103.2275, 20.66824], [-103.235518, 20.669202], [-103.23885, 20.6655], [-103.235275, 20.653584], [-103.2275, 20.658638]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección VI', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2737 
              AND col.name = 'Colonia Jalisco Sección VI' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Pinos Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2737 
              AND col.name = 'Los Pinos Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2743 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2743, '{"type": "Polygon", "coordinates": [[[-103.27125, 20.659517], [-103.285, 20.657683], [-103.285, 20.64625], [-103.27289, 20.64625], [-103.27121, 20.648], [-103.269739, 20.657199], [-103.27125, 20.659517]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Basilio Badillo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2743 
              AND col.name = 'Basilio Badillo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Ciudad Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2743 
              AND col.name = 'Ciudad Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2744 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2744, '{"type": "Polygon", "coordinates": [[[-103.27214, 20.63], [-103.26926, 20.638], [-103.27289, 20.64625], [-103.285, 20.64625], [-103.285, 20.63], [-103.27214, 20.63]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Residencial del Prado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2744 
              AND col.name = 'Residencial del Prado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Camichín', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2744 
              AND col.name = 'Lomas del Camichín' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2745 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2745, '{"type": "Polygon", "coordinates": [[[-103.268576, 20.67], [-103.27125, 20.67615], [-103.285, 20.6734], [-103.285, 20.6683], [-103.27125, 20.666925], [-103.268576, 20.67]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Aztlán Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2745 
              AND col.name = 'Aztlán Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Floresta', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2745 
              AND col.name = 'La Floresta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Molino', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2745 
              AND col.name = 'El Molino' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2751 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2751, '{"type": "Polygon", "coordinates": [[[-103.271429, 20.615], [-103.270027, 20.61718], [-103.27046, 20.628], [-103.27214, 20.63], [-103.285, 20.63], [-103.285, 20.615], [-103.271429, 20.615]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Ciudad Aztlán Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2751 
              AND col.name = 'Ciudad Aztlán Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Prado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2751 
              AND col.name = 'Paseos del Prado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2752 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2752, '{"type": "Polygon", "coordinates": [[[-103.267572, 20.606], [-103.271429, 20.615], [-103.285, 20.615], [-103.285, 20.578889], [-103.267572, 20.606]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Camichines Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2752 
              AND col.name = 'Los Camichines Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Prados de la Cañada', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2752 
              AND col.name = 'Prados de la Cañada' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2708 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2708, '{"type": "Polygon", "coordinates": [[[-103.241888, 20.604567], [-103.237529, 20.608381], [-103.237701, 20.608707], [-103.246207, 20.61615], [-103.249207, 20.605651], [-103.241888, 20.604567]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Rosario', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2708 
              AND col.name = 'El Rosario' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Cruz de las Huertas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2708 
              AND col.name = 'Santa Cruz de las Huertas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Arroyo Seco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2708 
              AND col.name = 'Arroyo Seco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2730 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2730, '{"type": "Polygon", "coordinates": [[[-103.24261, 20.59225], [-103.24074, 20.595], [-103.241888, 20.604567], [-103.249207, 20.605651], [-103.255, 20.605052], [-103.255, 20.59225], [-103.24261, 20.59225]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia del Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2730 
              AND col.name = 'Colonia del Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Providencia', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2730 
              AND col.name = 'La Providencia' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2731 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2731, '{"type": "Polygon", "coordinates": [[[-103.267572, 20.606], [-103.256019, 20.606], [-103.255574, 20.618001], [-103.2565, 20.619316], [-103.270027, 20.61718], [-103.271429, 20.615], [-103.267572, 20.606]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Prados del Nilo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2731 
              AND col.name = 'Prados del Nilo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2731 
              AND col.name = 'Villas de Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2732 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2732, '{"type": "Polygon", "coordinates": [[[-103.255, 20.59225], [-103.255, 20.605051], [-103.256019, 20.606], [-103.267572, 20.606], [-103.285, 20.578889], [-103.285, 20.57], [-103.273542, 20.57], [-103.255, 20.59225]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Balcones del Rosario', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2732 
              AND col.name = 'Balcones del Rosario' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Sauz', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2732 
              AND col.name = 'El Sauz' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2765 (Distrito 7)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2765, '{"type": "Polygon", "coordinates": [[[-103.23989, 20.58375], [-103.24261, 20.59225], [-103.255, 20.59225], [-103.273542, 20.57], [-103.24924, 20.57], [-103.23989, 20.58375]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Cruz Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2765 
              AND col.name = 'Santa Cruz Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Santa Cruz', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2765 
              AND col.name = 'Villas de Santa Cruz' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2683 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2683, '{"type": "Polygon", "coordinates": [[[-103.228125, 20.595], [-103.226458, 20.605], [-103.22836, 20.607282], [-103.233001, 20.608647], [-103.237529, 20.608381], [-103.241888, 20.604567], [-103.24074, 20.595], [-103.228125, 20.595]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Praderas del Sol', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2683 
              AND col.name = 'Praderas del Sol' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Paula Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2683 
              AND col.name = 'Santa Paula Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2684 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2684, '{"type": "Polygon", "coordinates": [[[-103.225625, 20.59], [-103.228125, 20.595], [-103.24074, 20.595], [-103.24261, 20.59225], [-103.23989, 20.58375], [-103.22875, 20.58375], [-103.225625, 20.59]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Paula Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2684 
              AND col.name = 'Santa Paula Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Ladrillera', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2684 
              AND col.name = 'La Ladrillera' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2685 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2685, '{"type": "Polygon", "coordinates": [[[-103.22625, 20.57625], [-103.22875, 20.58375], [-103.239891, 20.58375], [-103.24924, 20.57], [-103.22625, 20.57], [-103.22625, 20.57625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Jauja', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2685 
              AND col.name = 'Jauja' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Severiana', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2685 
              AND col.name = 'La Severiana' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2686 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2686, '{"type": "Polygon", "coordinates": [[[-103.20875, 20.58675], [-103.20875, 20.605179], [-103.21, 20.605], [-103.225, 20.59], [-103.20875, 20.58675]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Arroyo de Enmedio', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2686 
              AND col.name = 'Arroyo de Enmedio' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Agua Escondida', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2686 
              AND col.name = 'Agua Escondida' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2692 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2692, '{"type": "Polygon", "coordinates": [[[-103.19875, 20.58625], [-103.208438, 20.58625], [-103.20875, 20.585], [-103.20875, 20.57], [-103.1825, 20.57], [-103.19875, 20.58625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Paula Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2692 
              AND col.name = 'Santa Paula Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Pedregal', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2692 
              AND col.name = 'El Pedregal' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2740 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2740, '{"type": "Polygon", "coordinates": [[[-103.190312, 20.5975], [-103.19875, 20.58625], [-103.1825, 20.57], [-103.17, 20.57], [-103.17, 20.5975], [-103.190312, 20.5975]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Punta', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2740 
              AND col.name = 'La Punta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Francisco de la Soledad', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2740 
              AND col.name = 'San Francisco de la Soledad' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2741 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2741, '{"type": "Polygon", "coordinates": [[[-103.20875, 20.585], [-103.22625, 20.57625], [-103.22625, 20.57], [-103.20875, 20.57], [-103.20875, 20.585]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Luis Gonzaga', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2741 
              AND col.name = 'San Luis Gonzaga' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Sillita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2741 
              AND col.name = 'La Sillita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2687 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2687, '{"type": "Polygon", "coordinates": [[[-103.211936, 20.622581], [-103.210556, 20.635], [-103.212639, 20.63875], [-103.22135, 20.63875], [-103.22765, 20.632], [-103.22365, 20.622], [-103.222132, 20.621124], [-103.211936, 20.622581]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coyula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2687 
              AND col.name = 'Coyula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Gaspar de las Flores', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2687 
              AND col.name = 'San Gaspar de las Flores' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2688 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2688, '{"type": "Polygon", "coordinates": [[[-103.210139, 20.65], [-103.212361, 20.655], [-103.217107, 20.655], [-103.23074, 20.645457], [-103.221351, 20.63875], [-103.212639, 20.63875], [-103.210139, 20.65]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Cofradía', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2688 
              AND col.name = 'La Cofradía' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San José de las Flores', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2688 
              AND col.name = 'San José de las Flores' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2706 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2706, '{"type": "Polygon", "coordinates": [[[-103.210568, 20.663068], [-103.2205, 20.673], [-103.2275, 20.66824], [-103.2275, 20.658638], [-103.217107, 20.655], [-103.212361, 20.655], [-103.210568, 20.663068]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coyula Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2706 
              AND col.name = 'Coyula Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Isabel', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2706 
              AND col.name = 'Santa Isabel' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2724 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2724, '{"type": "Polygon", "coordinates": [[[-103.204545, 20.612727], [-103.1975, 20.61625], [-103.192812, 20.635], [-103.210556, 20.635], [-103.211936, 20.622581], [-103.204545, 20.612727]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Pocitos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2724 
              AND col.name = 'Los Pocitos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Gaspar Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2724 
              AND col.name = 'San Gaspar Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2725 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2725, '{"type": "Polygon", "coordinates": [[[-103.189166, 20.637083], [-103.190781, 20.65], [-103.210139, 20.65], [-103.212639, 20.63875], [-103.210556, 20.635], [-103.192812, 20.635], [-103.189166, 20.637083]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coyula Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2725 
              AND col.name = 'Coyula Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Potrero de San José', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2725 
              AND col.name = 'Potrero de San José' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2742 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2742, '{"type": "Polygon", "coordinates": [[[-103.18375, 20.65625], [-103.187697, 20.654934], [-103.190781, 20.65], [-103.189166, 20.637083], [-103.185, 20.635], [-103.17, 20.635], [-103.17, 20.65625], [-103.18375, 20.65625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas del Sol', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2742 
              AND col.name = 'Villas del Sol' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colinas del Rey', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2742 
              AND col.name = 'Colinas del Rey' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2770 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2770, '{"type": "Polygon", "coordinates": [[[-103.199338, 20.669485], [-103.210568, 20.663068], [-103.212361, 20.655], [-103.210139, 20.65], [-103.190781, 20.65], [-103.187697, 20.654934], [-103.199338, 20.669485]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de San Gaspar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2770 
              AND col.name = 'Paseos de San Gaspar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Bonita Coyula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2770 
              AND col.name = 'Loma Bonita Coyula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2689 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2689, '{"type": "Polygon", "coordinates": [[[-103.185, 20.61625], [-103.1975, 20.61625], [-103.204545, 20.612727], [-103.20511, 20.609338], [-103.190312, 20.5975], [-103.17, 20.5975], [-103.17, 20.607679], [-103.185, 20.61625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Puente Grande', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2689 
              AND col.name = 'Puente Grande' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Tololotlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2689 
              AND col.name = 'Tololotlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2690 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2690, '{"type": "Polygon", "coordinates": [[[-103.185, 20.635], [-103.189166, 20.637083], [-103.192812, 20.635], [-103.1975, 20.61625], [-103.185, 20.61625], [-103.185, 20.635]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Vado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2690 
              AND col.name = 'El Vado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Pinar de las Palomas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2690 
              AND col.name = 'Pinar de las Palomas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2691 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2691, '{"type": "Polygon", "coordinates": [[[-103.20511, 20.609338], [-103.20875, 20.605179], [-103.20875, 20.58675], [-103.208438, 20.58625], [-103.19875, 20.58625], [-103.190313, 20.5975], [-103.20511, 20.609338]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Miguel de la Punta', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2691 
              AND col.name = 'San Miguel de la Punta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda del Real', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2691 
              AND col.name = 'Hacienda del Real' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2753 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2753, '{"type": "Polygon", "coordinates": [[[-103.18375, 20.65625], [-103.17, 20.65625], [-103.17, 20.685], [-103.18375, 20.685], [-103.18375, 20.65625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Matatlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2753 
              AND col.name = 'Matatlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Puerta del Vado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2753 
              AND col.name = 'La Puerta del Vado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2754 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2754, '{"type": "Polygon", "coordinates": [[[-103.185, 20.635], [-103.185, 20.61625], [-103.17, 20.607679], [-103.17, 20.635], [-103.185, 20.635]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Los Ramos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2754 
              AND col.name = 'Hacienda Los Ramos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Álamos Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2754 
              AND col.name = 'Los Álamos Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2746 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2746, '{"type": "Polygon", "coordinates": [[[-103.217107, 20.655], [-103.2275, 20.658637], [-103.235275, 20.653583], [-103.237299, 20.648813], [-103.233, 20.64604], [-103.23074, 20.645457], [-103.217107, 20.655]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Bosques de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2746 
              AND col.name = 'Bosques de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Buenavista', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2746 
              AND col.name = 'Buenavista' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rincón del Mezquite', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2746 
              AND col.name = 'Rincón del Mezquite' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2747 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2747, '{"type": "Polygon", "coordinates": [[[-103.2205, 20.683], [-103.236751, 20.67325], [-103.235519, 20.669202], [-103.2275, 20.66824], [-103.2205, 20.673], [-103.2205, 20.683]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colinas de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2747 
              AND col.name = 'Colinas de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Conejos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2747 
              AND col.name = 'Los Conejos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Valle del Sol', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2747 
              AND col.name = 'Valle del Sol' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2748 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2748, '{"type": "Polygon", "coordinates": [[[-103.2205, 20.683002], [-103.2205, 20.673], [-103.210568, 20.663068], [-103.199338, 20.669485], [-103.194167, 20.685], [-103.220278, 20.685], [-103.2205, 20.683002]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada de la Presa', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2748 
              AND col.name = 'Rinconada de la Presa' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Bugambilias Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2748 
              AND col.name = 'Bugambilias Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2749 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2749, '{"type": "Polygon", "coordinates": [[[-103.199338, 20.669486], [-103.187697, 20.654934], [-103.18375, 20.65625], [-103.18375, 20.685], [-103.194167, 20.685], [-103.199338, 20.669486]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Pinos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2749 
              AND col.name = 'Los Pinos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Huertas de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2749 
              AND col.name = 'Huertas de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2750 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2750, '{"type": "Polygon", "coordinates": [[[-103.20511, 20.609338], [-103.204545, 20.612728], [-103.211935, 20.622581], [-103.222131, 20.621124], [-103.22836, 20.607282], [-103.226458, 20.605], [-103.209997, 20.605], [-103.208751, 20.605178], [-103.20511, 20.609338]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Manantial Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2750 
              AND col.name = 'Lomas del Manantial Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Real', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2750 
              AND col.name = 'Hacienda Real' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Loma', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2750 
              AND col.name = 'La Loma' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2755 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2755, '{"type": "Polygon", "coordinates": [[[-103.225, 20.59], [-103.21, 20.605], [-103.226459, 20.605], [-103.228125, 20.595], [-103.225625, 20.59], [-103.225, 20.59]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Valle', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2755 
              AND col.name = 'Paseos del Valle' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Mateo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2755 
              AND col.name = 'San Mateo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        -- Sección #2756 (Distrito 20)
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2756, '{"type": "Polygon", "coordinates": [[[-103.20875, 20.585], [-103.208437, 20.58625], [-103.20875, 20.58675], [-103.224998, 20.59], [-103.225625, 20.59], [-103.22875, 20.58375], [-103.22625, 20.57625], [-103.20875, 20.585]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Sur Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2756 
              AND col.name = 'Lomas del Sur Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Fracc. El Laurel', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2756 
              AND col.name = 'Fracc. El Laurel' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            
COMMIT;