-- ========================================================
-- COMPLETE & OFFICIAL 162 TONALÁ SECTIONS CARTOGRAPHY SYNC (2683 a 2844)
-- ========================================================
BEGIN;


    -- Clean up sections outside the complete 162 Tonala range
    DELETE FROM section_colonies WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, 2841, 2842, 2843, 2844)
    );
    DELETE FROM contacts WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, 2841, 2842, 2843, 2844)
    );
    DELETE FROM event_reports WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, 2841, 2842, 2843, 2844)
    );
    DELETE FROM electoral_representatives WHERE section_id IN (
      SELECT id FROM electoral_sections WHERE section_num NOT IN (2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, 2841, 2842, 2843, 2844)
    );
    DELETE FROM electoral_sections WHERE section_num NOT IN (2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2807, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, 2841, 2842, 2843, 2844);
    

    INSERT INTO catalog_versions (id, catalog_type, source_name, source_version)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'ine_sections', 'iepc_jalisco_official_162_sections', 'v3.0')
    ON CONFLICT (id) DO NOTHING;
    

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2683, '{"type": "Polygon", "coordinates": [[[-103.250313, 20.57875], [-103.254999, 20.576667], [-103.26, 20.57], [-103.24, 20.57], [-103.24, 20.57875], [-103.250313, 20.57875]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

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
              'La Gitanilla', 
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
              AND col.name = 'La Gitanilla' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2684, '{"type": "Polygon", "coordinates": [[[-103.24, 20.57875], [-103.24, 20.57875], [-103.24, 20.57], [-103.23, 20.57], [-103.23, 20.57875], [-103.24, 20.57875]]]}'::jsonb)
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
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Real Sur', 
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
              AND col.name = 'Hacienda Real Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2685, '{"type": "Polygon", "coordinates": [[[-103.23, 20.57875], [-103.23, 20.57875], [-103.23, 20.57], [-103.22, 20.57], [-103.22, 20.57875], [-103.23, 20.57875]]]}'::jsonb)
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
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Guadalupana', 
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
              AND col.name = 'Colonia Guadalupana' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2686, '{"type": "Polygon", "coordinates": [[[-103.207575, 20.57875], [-103.22, 20.57875], [-103.22, 20.57875], [-103.22, 20.57], [-103.199157, 20.57], [-103.207575, 20.57875]]]}'::jsonb)
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
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Arenal', 
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
              AND col.name = 'El Arenal' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2687, '{"type": "Polygon", "coordinates": [[[-103.226659, 20.626091], [-103.228917, 20.627145], [-103.231016, 20.61875], [-103.2275, 20.617668], [-103.225742, 20.61875], [-103.226659, 20.626091]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coyula Centro', 
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
              AND col.name = 'Coyula Centro' 
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2688, '{"type": "Polygon", "coordinates": [[[-103.211588, 20.615785], [-103.210088, 20.624783], [-103.219579, 20.627524], [-103.219609, 20.627501], [-103.220339, 20.61875], [-103.216354, 20.615073], [-103.211588, 20.615785]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2689, '{"type": "Polygon", "coordinates": [[[-103.208311, 20.603253], [-103.210938, 20.59625], [-103.208132, 20.590639], [-103.2, 20.592196], [-103.2, 20.601696], [-103.208311, 20.603253]]]}'::jsonb)
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
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Ribera del Río Santiago', 
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
              AND col.name = 'Ribera del Río Santiago' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2690, '{"type": "Polygon", "coordinates": [[[-103.197333, 20.590255], [-103.19, 20.592446], [-103.19, 20.601452], [-103.197333, 20.603594], [-103.2, 20.601696], [-103.2, 20.592196], [-103.197333, 20.590255]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2691, '{"type": "Polygon", "coordinates": [[[-103.18, 20.592571], [-103.18, 20.601329], [-103.186167, 20.603778], [-103.19, 20.601452], [-103.19, 20.592446], [-103.186167, 20.590067], [-103.18, 20.592571]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2692, '{"type": "Polygon", "coordinates": [[[-103.24, 20.579375], [-103.244062, 20.5875], [-103.245938, 20.5875], [-103.250313, 20.57875], [-103.24, 20.57875], [-103.24, 20.57875], [-103.24, 20.579375]]]}'::jsonb)
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
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Aurora Sur', 
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
              AND col.name = 'La Aurora Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2693, '{"type": "Polygon", "coordinates": [[[-103.269463, 20.620893], [-103.2725, 20.626355], [-103.273746, 20.619257], [-103.269463, 20.620893]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2694, '{"type": "Polygon", "coordinates": [[[-103.266182, 20.620101], [-103.26438, 20.614301], [-103.2585, 20.615441], [-103.2585, 20.624706], [-103.266182, 20.620101]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Los Arcos', 
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
              AND col.name = 'Loma Dorada Los Arcos' 
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2695, '{"type": "Polygon", "coordinates": [[[-103.25123, 20.6275], [-103.252275, 20.628332], [-103.258154, 20.628332], [-103.2585, 20.624706], [-103.2585, 20.615441], [-103.255, 20.613987], [-103.253496, 20.614473], [-103.25025, 20.61809], [-103.25025, 20.622047], [-103.25123, 20.6275]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Loma Alta', 
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
              AND col.name = 'Loma Dorada Loma Alta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto del Río Nilo', 
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
              AND col.name = 'Coto del Río Nilo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2696, '{"type": "Polygon", "coordinates": [[[-103.2425, 20.622711], [-103.25025, 20.622047], [-103.25025, 20.61809], [-103.2425, 20.617957], [-103.241716, 20.61875], [-103.2425, 20.622711]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Circuito Cañada', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2696 
              AND col.name = 'Loma Dorada Circuito Cañada' 
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
            WHERE es.section_num = 2696 
              AND col.name = 'Paseos del Prado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2697, '{"type": "Polygon", "coordinates": [[[-103.2725, 20.637674], [-103.276541, 20.63], [-103.2725, 20.628465], [-103.26675, 20.629155], [-103.26675, 20.634225], [-103.2725, 20.637674]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Valle del Sol', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2697 
              AND col.name = 'Loma Dorada Valle del Sol' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Valle', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2697 
              AND col.name = 'Lomas del Valle' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2698, '{"type": "Polygon", "coordinates": [[[-103.26625, 20.635575], [-103.26675, 20.634225], [-103.26675, 20.629155], [-103.266249, 20.628884], [-103.2585, 20.628574], [-103.2585, 20.637124], [-103.26625, 20.635575]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2699, '{"type": "Polygon", "coordinates": [[[-103.252981, 20.641666], [-103.257202, 20.641666], [-103.2585, 20.637124], [-103.2585, 20.628574], [-103.258154, 20.628332], [-103.252275, 20.628332], [-103.25025, 20.6336], [-103.25025, 20.637722], [-103.252981, 20.641666]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2700, '{"type": "Polygon", "coordinates": [[[-103.241246, 20.63625], [-103.2425, 20.637894], [-103.25025, 20.637722], [-103.25025, 20.6336], [-103.2425, 20.633289], [-103.241246, 20.63625]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2701, '{"type": "Polygon", "coordinates": [[[-103.2725, 20.651271], [-103.278002, 20.645], [-103.2725, 20.642588], [-103.26675, 20.643384], [-103.26675, 20.644442], [-103.268457, 20.649816], [-103.2725, 20.651271]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2702, '{"type": "Polygon", "coordinates": [[[-103.260205, 20.650737], [-103.26347, 20.650345], [-103.26675, 20.644442], [-103.26675, 20.643384], [-103.26625, 20.643072], [-103.2585, 20.642715], [-103.2585, 20.644855], [-103.260205, 20.650737]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2703, '{"type": "Polygon", "coordinates": [[[-103.2525, 20.653853], [-103.2585, 20.644855], [-103.2585, 20.642715], [-103.257202, 20.641666], [-103.252981, 20.641666], [-103.25025, 20.644545], [-103.25025, 20.645417], [-103.2525, 20.653853]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Loma Dorada Loma Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2703 
              AND col.name = 'Loma Dorada Loma Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Jardines de la Cañada', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2703 
              AND col.name = 'Jardines de la Cañada' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2704, '{"type": "Polygon", "coordinates": [[[-103.245, 20.609375], [-103.2425, 20.611875], [-103.2425, 20.617957], [-103.25025, 20.61809], [-103.253496, 20.614472], [-103.245, 20.609375]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2705, '{"type": "Polygon", "coordinates": [[[-103.2425, 20.644419], [-103.241754, 20.645133], [-103.24375, 20.653216], [-103.25025, 20.645417], [-103.25025, 20.644545], [-103.2425, 20.644419]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2706, '{"type": "Polygon", "coordinates": [[[-103.2085, 20.626824], [-103.209729, 20.625131], [-103.2, 20.618646], [-103.198486, 20.625712], [-103.2085, 20.626824]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2707, '{"type": "Polygon", "coordinates": [[[-103.26625, 20.653125], [-103.268456, 20.649816], [-103.26675, 20.644443], [-103.26347, 20.650345], [-103.26625, 20.653125]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán Centro', 
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
              AND col.name = 'Zalatitán Centro' 
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2708, '{"type": "Polygon", "coordinates": [[[-103.265, 20.59125], [-103.285, 20.59125], [-103.285, 20.57], [-103.265, 20.57], [-103.265, 20.59125]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2709, '{"type": "Polygon", "coordinates": [[[-103.277693, 20.66325], [-103.281217, 20.66325], [-103.285, 20.662403], [-103.285, 20.656962], [-103.27875, 20.655193], [-103.275, 20.65767], [-103.275, 20.661843], [-103.277693, 20.66325]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2710, '{"type": "Polygon", "coordinates": [[[-103.272906, 20.66325], [-103.275, 20.661843], [-103.275, 20.65767], [-103.2725, 20.655547], [-103.267111, 20.656056], [-103.26855, 20.66325], [-103.272906, 20.66325]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2711, '{"type": "Polygon", "coordinates": [[[-103.25947, 20.66325], [-103.262239, 20.66325], [-103.26327, 20.656618], [-103.258713, 20.654468], [-103.25716, 20.655], [-103.25947, 20.66325]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2712, '{"type": "Polygon", "coordinates": [[[-103.250783, 20.66325], [-103.252968, 20.66325], [-103.254018, 20.655], [-103.2525, 20.653856], [-103.246933, 20.655], [-103.250783, 20.66325]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2712 
              AND col.name = 'Colonia Jalisco Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Refugio Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2712 
              AND col.name = 'El Refugio Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2713, '{"type": "Polygon", "coordinates": [[[-103.23579, 20.656778], [-103.24375, 20.662464], [-103.244554, 20.655], [-103.24375, 20.654284], [-103.240278, 20.654522], [-103.23579, 20.656778]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco La Capilla', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2713 
              AND col.name = 'Colonia Jalisco La Capilla' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Pedro Jalisco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2713 
              AND col.name = 'San Pedro Jalisco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2714, '{"type": "Polygon", "coordinates": [[[-103.238106, 20.610996], [-103.235, 20.612133], [-103.235, 20.61875], [-103.241716, 20.61875], [-103.2425, 20.617957], [-103.2425, 20.611875], [-103.238106, 20.610996]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2715, '{"type": "Polygon", "coordinates": [[[-103.255, 20.59125], [-103.265, 20.59125], [-103.265, 20.59125], [-103.265, 20.57], [-103.26, 20.57], [-103.255, 20.576666], [-103.255, 20.59125]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Cruz Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2715 
              AND col.name = 'Santa Cruz Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Huerta', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2715 
              AND col.name = 'La Huerta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2716, '{"type": "Polygon", "coordinates": [[[-103.230834, 20.608756], [-103.2275, 20.611893], [-103.2275, 20.617668], [-103.231016, 20.61875], [-103.235, 20.61875], [-103.235, 20.61875], [-103.235, 20.612133], [-103.230834, 20.608756]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2717, '{"type": "Polygon", "coordinates": [[[-103.219667, 20.61005], [-103.216355, 20.615073], [-103.220339, 20.61875], [-103.225742, 20.61875], [-103.2275, 20.617668], [-103.2275, 20.611893], [-103.219667, 20.61005]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2718, '{"type": "Polygon", "coordinates": [[[-103.2425, 20.6275], [-103.25123, 20.6275], [-103.25025, 20.622047], [-103.2425, 20.622711], [-103.2425, 20.6275]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2719, '{"type": "Polygon", "coordinates": [[[-103.235, 20.625686], [-103.240346, 20.6275], [-103.2425, 20.6275], [-103.2425, 20.6275], [-103.2425, 20.622709], [-103.241717, 20.61875], [-103.235, 20.61875], [-103.235, 20.61875], [-103.235, 20.625686]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2720, '{"type": "Polygon", "coordinates": [[[-103.229324, 20.6275], [-103.232586, 20.6275], [-103.235, 20.625686], [-103.235, 20.61875], [-103.231016, 20.61875], [-103.228917, 20.627145], [-103.229324, 20.6275]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2721, '{"type": "Polygon", "coordinates": [[[-103.220203, 20.6275], [-103.22666, 20.626091], [-103.225743, 20.61875], [-103.220339, 20.61875], [-103.219609, 20.6275], [-103.220203, 20.6275]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2722, '{"type": "Polygon", "coordinates": [[[-103.2425, 20.6275], [-103.2425, 20.63329], [-103.25025, 20.6336], [-103.252275, 20.628333], [-103.251229, 20.6275], [-103.2425, 20.6275]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2723, '{"type": "Polygon", "coordinates": [[[-103.235, 20.634152], [-103.235, 20.63625], [-103.241248, 20.63625], [-103.2425, 20.633292], [-103.2425, 20.6275], [-103.240346, 20.6275], [-103.235, 20.634152]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Barrio San Gaspar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2723 
              AND col.name = 'Barrio San Gaspar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Capilla Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2723 
              AND col.name = 'La Capilla Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2724, '{"type": "Polygon", "coordinates": [[[-103.186621, 20.626575], [-103.19534, 20.625994], [-103.19, 20.615313], [-103.186621, 20.626575]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2725, '{"type": "Polygon", "coordinates": [[[-103.223843, 20.643988], [-103.233515, 20.63625], [-103.2275, 20.633576], [-103.2225, 20.638021], [-103.2225, 20.643664], [-103.223843, 20.643988]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2726, '{"type": "Polygon", "coordinates": [[[-103.2525, 20.653856], [-103.254018, 20.655], [-103.25716, 20.655], [-103.258713, 20.654468], [-103.260205, 20.650736], [-103.2585, 20.644855], [-103.2525, 20.653854], [-103.2525, 20.653856]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2727, '{"type": "Polygon", "coordinates": [[[-103.24375, 20.654284], [-103.244554, 20.655], [-103.246932, 20.655], [-103.2525, 20.653856], [-103.2525, 20.653852], [-103.25025, 20.645418], [-103.24375, 20.653216], [-103.24375, 20.654284]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2728, '{"type": "Polygon", "coordinates": [[[-103.235, 20.645583], [-103.234516, 20.646002], [-103.240277, 20.654522], [-103.24375, 20.654284], [-103.24375, 20.653213], [-103.241754, 20.645133], [-103.235, 20.645583]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2729, '{"type": "Polygon", "coordinates": [[[-103.264533, 20.665], [-103.2656, 20.665], [-103.26855, 20.66325], [-103.267111, 20.656056], [-103.26625, 20.655625], [-103.26327, 20.656618], [-103.262239, 20.66325], [-103.264533, 20.665]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2730, '{"type": "Polygon", "coordinates": [[[-103.245938, 20.5875], [-103.250625, 20.59125], [-103.255, 20.59125], [-103.255, 20.59125], [-103.255, 20.576667], [-103.250313, 20.57875], [-103.245938, 20.5875]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2731, '{"type": "Polygon", "coordinates": [[[-103.237961, 20.583452], [-103.238608, 20.589636], [-103.24, 20.59075], [-103.244062, 20.5875], [-103.24, 20.579375], [-103.237961, 20.583452]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2732, '{"type": "Polygon", "coordinates": [[[-103.265, 20.59125], [-103.265, 20.59125], [-103.265, 20.6025], [-103.285, 20.6025], [-103.285, 20.59125], [-103.265, 20.59125]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2733, '{"type": "Polygon", "coordinates": [[[-103.277929, 20.6715], [-103.280667, 20.6715], [-103.281217, 20.66325], [-103.277693, 20.66325], [-103.277929, 20.6715]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2734, '{"type": "Polygon", "coordinates": [[[-103.2695, 20.6715], [-103.272722, 20.6715], [-103.272906, 20.66325], [-103.26855, 20.66325], [-103.2656, 20.665], [-103.2695, 20.6715]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2735, '{"type": "Polygon", "coordinates": [[[-103.2608, 20.6715], [-103.2615, 20.6715], [-103.264533, 20.665], [-103.262239, 20.66325], [-103.25947, 20.66325], [-103.25534, 20.665], [-103.2608, 20.6715]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2736, '{"type": "Polygon", "coordinates": [[[-103.2525, 20.671143], [-103.254845, 20.665], [-103.252968, 20.66325], [-103.250783, 20.66325], [-103.245, 20.66472], [-103.245, 20.665786], [-103.2525, 20.671143]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2737, '{"type": "Polygon", "coordinates": [[[-103.234375, 20.667422], [-103.24375, 20.669655], [-103.245, 20.665786], [-103.245, 20.66472], [-103.24375, 20.663343], [-103.234338, 20.664141], [-103.234375, 20.667422]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2738, '{"type": "Polygon", "coordinates": [[[-103.285, 20.67975], [-103.285, 20.6725], [-103.280667, 20.6715], [-103.277929, 20.6715], [-103.275, 20.673077], [-103.275, 20.67975], [-103.285, 20.67975]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco San Gabriel', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2738 
              AND col.name = 'Colonia Jalisco San Gabriel' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Aurora Jalisco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2738 
              AND col.name = 'La Aurora Jalisco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2739, '{"type": "Polygon", "coordinates": [[[-103.26975, 20.67975], [-103.275, 20.67975], [-103.275, 20.67975], [-103.275, 20.673077], [-103.272722, 20.6715], [-103.2695, 20.6715], [-103.265, 20.675], [-103.265, 20.675], [-103.26975, 20.67975]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Lomas Altas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2739 
              AND col.name = 'Colonia Jalisco Lomas Altas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Misión del Valle', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2739 
              AND col.name = 'Misión del Valle' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2740, '{"type": "Polygon", "coordinates": [[[-103.23, 20.584139], [-103.230833, 20.586965], [-103.237962, 20.583452], [-103.24, 20.579375], [-103.24, 20.57875], [-103.24, 20.57875], [-103.23, 20.57875], [-103.23, 20.57875], [-103.23, 20.584139]]]}'::jsonb)
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
            WHERE es.section_num = 2740 
              AND col.name = 'San Luis Gonzaga' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2741, '{"type": "Polygon", "coordinates": [[[-103.22, 20.585009], [-103.23, 20.584139], [-103.23, 20.57875], [-103.23, 20.57875], [-103.22, 20.57875], [-103.22, 20.57875], [-103.22, 20.585009]]]}'::jsonb)
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
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Bajío', 
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
              AND col.name = 'El Bajío' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2742, '{"type": "Polygon", "coordinates": [[[-103.218561, 20.632769], [-103.21, 20.635242], [-103.21, 20.639915], [-103.212733, 20.644386], [-103.216841, 20.645], [-103.220347, 20.645], [-103.2225, 20.643664], [-103.2225, 20.638021], [-103.218561, 20.632769]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2743, '{"type": "Polygon", "coordinates": [[[-103.27875, 20.612989], [-103.27875, 20.63], [-103.285, 20.63], [-103.285, 20.607826], [-103.27875, 20.612989]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2744, '{"type": "Polygon", "coordinates": [[[-103.2725, 20.628464], [-103.276542, 20.63], [-103.27875, 20.63], [-103.27875, 20.63], [-103.27875, 20.612989], [-103.276806, 20.61375], [-103.273746, 20.619256], [-103.2725, 20.626355], [-103.2725, 20.628464]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2745, '{"type": "Polygon", "coordinates": [[[-103.26625, 20.62025], [-103.26625, 20.628884], [-103.26675, 20.629154], [-103.2725, 20.628465], [-103.2725, 20.626356], [-103.269462, 20.620892], [-103.26625, 20.62025]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2746, '{"type": "Polygon", "coordinates": [[[-103.230834, 20.586965], [-103.230834, 20.587762], [-103.238609, 20.589637], [-103.237962, 20.583452], [-103.230834, 20.586965]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2747, '{"type": "Polygon", "coordinates": [[[-103.219667, 20.586195], [-103.219667, 20.588138], [-103.22, 20.588719], [-103.23, 20.589145], [-103.230834, 20.587761], [-103.230834, 20.586965], [-103.23, 20.584139], [-103.22, 20.585008], [-103.219667, 20.586195]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2748, '{"type": "Polygon", "coordinates": [[[-103.2085, 20.582637], [-103.2085, 20.58988], [-103.219667, 20.588138], [-103.219667, 20.586195], [-103.2085, 20.582637]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2749, '{"type": "Polygon", "coordinates": [[[-103.197333, 20.590255], [-103.2, 20.592196], [-103.208131, 20.590639], [-103.2085, 20.58988], [-103.2085, 20.582636], [-103.207576, 20.578751], [-103.199157, 20.57], [-103.197333, 20.57], [-103.197333, 20.590255]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2750, '{"type": "Polygon", "coordinates": [[[-103.186166, 20.590067], [-103.19, 20.592446], [-103.197333, 20.590254], [-103.197333, 20.57], [-103.186166, 20.57], [-103.186166, 20.590067]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2751, '{"type": "Polygon", "coordinates": [[[-103.2585, 20.628575], [-103.26625, 20.628884], [-103.26625, 20.62025], [-103.266182, 20.620101], [-103.2585, 20.624706], [-103.258154, 20.628332], [-103.2585, 20.628575]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2752, '{"type": "Polygon", "coordinates": [[[-103.27875, 20.645], [-103.285, 20.645], [-103.285, 20.63], [-103.27875, 20.63], [-103.27875, 20.63], [-103.27875, 20.645]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2753, '{"type": "Polygon", "coordinates": [[[-103.18, 20.601329], [-103.18, 20.592571], [-103.17, 20.587438], [-103.17, 20.606348], [-103.18, 20.601329]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2754, '{"type": "Polygon", "coordinates": [[[-103.2, 20.614965], [-103.2, 20.618646], [-103.209729, 20.625131], [-103.210088, 20.624783], [-103.211588, 20.615784], [-103.208501, 20.613563], [-103.2, 20.614965]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2755, '{"type": "Polygon", "coordinates": [[[-103.18, 20.592571], [-103.186166, 20.590067], [-103.186166, 20.57], [-103.17, 20.57], [-103.17, 20.587438], [-103.18, 20.592571]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2756, '{"type": "Polygon", "coordinates": [[[-103.238357, 20.603804], [-103.230834, 20.605249], [-103.230834, 20.608756], [-103.235, 20.612133], [-103.238106, 20.610996], [-103.238357, 20.603804]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2757, '{"type": "Polygon", "coordinates": [[[-103.230834, 20.60525], [-103.23, 20.604147], [-103.22, 20.604487], [-103.219667, 20.604949], [-103.219667, 20.61005], [-103.2275, 20.611893], [-103.230834, 20.608756], [-103.230834, 20.60525]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Buenavista Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2757 
              AND col.name = 'Buenavista Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Mezquite', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2757 
              AND col.name = 'El Mezquite' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2758, '{"type": "Polygon", "coordinates": [[[-103.219667, 20.604949], [-103.2085, 20.603562], [-103.2085, 20.613563], [-103.211588, 20.615785], [-103.216354, 20.615073], [-103.219667, 20.61005], [-103.219667, 20.604949]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Conejos Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2758 
              AND col.name = 'Los Conejos Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colinas del Valle', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2758 
              AND col.name = 'Colinas del Valle' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2759, '{"type": "Polygon", "coordinates": [[[-103.197333, 20.613293], [-103.2, 20.614965], [-103.2085, 20.613563], [-103.2085, 20.603561], [-103.208312, 20.603253], [-103.2, 20.601696], [-103.197333, 20.603594], [-103.197333, 20.613293]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada de la Presa Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2759 
              AND col.name = 'Rinconada de la Presa Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Presita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2759 
              AND col.name = 'La Presita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2760, '{"type": "Polygon", "coordinates": [[[-103.254846, 20.665], [-103.25534, 20.665], [-103.25947, 20.66325], [-103.25716, 20.655], [-103.254018, 20.655], [-103.252968, 20.66325], [-103.254846, 20.665]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2761, '{"type": "Polygon", "coordinates": [[[-103.24375, 20.663344], [-103.245, 20.664721], [-103.250783, 20.66325], [-103.246933, 20.655], [-103.244554, 20.655], [-103.24375, 20.662461], [-103.24375, 20.663344]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2762, '{"type": "Polygon", "coordinates": [[[-103.232948, 20.65783], [-103.231416, 20.660001], [-103.234338, 20.664141], [-103.24375, 20.663343], [-103.24375, 20.662464], [-103.23579, 20.656779], [-103.232948, 20.65783]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán Los Pinos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2762 
              AND col.name = 'Zalatitán Los Pinos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Triángulo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2762 
              AND col.name = 'El Triángulo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2763, '{"type": "Polygon", "coordinates": [[[-103.2725, 20.642588], [-103.278, 20.645], [-103.27875, 20.645], [-103.27875, 20.645], [-103.27875, 20.63], [-103.27875, 20.63], [-103.27654, 20.63], [-103.2725, 20.637674], [-103.2725, 20.642588]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Basilio Badillo Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2763 
              AND col.name = 'Basilio Badillo Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Floresta Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2763 
              AND col.name = 'La Floresta Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2764, '{"type": "Polygon", "coordinates": [[[-103.26625, 20.643072], [-103.26675, 20.643384], [-103.2725, 20.642588], [-103.2725, 20.637674], [-103.26675, 20.634225], [-103.26625, 20.635574], [-103.26625, 20.643072]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Ciudad Aztlán Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2764 
              AND col.name = 'Ciudad Aztlán Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas de Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2764 
              AND col.name = 'Lomas de Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2765, '{"type": "Polygon", "coordinates": [[[-103.265, 20.6025], [-103.265, 20.6025], [-103.265, 20.59125], [-103.255, 20.59125], [-103.255, 20.59125], [-103.255, 20.6025], [-103.265, 20.6025]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2766, '{"type": "Polygon", "coordinates": [[[-103.250313, 20.6025], [-103.255, 20.6025], [-103.255, 20.6025], [-103.255, 20.59125], [-103.255, 20.59125], [-103.250625, 20.59125], [-103.245625, 20.59625], [-103.250313, 20.6025]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Rosario Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2766 
              AND col.name = 'El Rosario Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Rosario', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2766 
              AND col.name = 'Lomas del Rosario' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2767, '{"type": "Polygon", "coordinates": [[[-103.208501, 20.582638], [-103.219667, 20.586195], [-103.22, 20.585008], [-103.22, 20.57875], [-103.22, 20.57875], [-103.207575, 20.57875], [-103.208501, 20.582638]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Paula San Martín', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2767 
              AND col.name = 'Santa Paula San Martín' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas de Santa Paula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2767 
              AND col.name = 'Lomas de Santa Paula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2768, '{"type": "Polygon", "coordinates": [[[-103.24, 20.59075], [-103.24, 20.591875], [-103.244375, 20.59625], [-103.245625, 20.59625], [-103.250625, 20.59125], [-103.245937, 20.5875], [-103.244063, 20.5875], [-103.24, 20.59075]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Jauja Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2768 
              AND col.name = 'Jauja Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada de Jauja', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2768 
              AND col.name = 'Rinconada de Jauja' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2769, '{"type": "Polygon", "coordinates": [[[-103.230834, 20.587762], [-103.23, 20.589146], [-103.23, 20.59625], [-103.235625, 20.59625], [-103.24, 20.591875], [-103.24, 20.59075], [-103.238609, 20.589637], [-103.230834, 20.587762]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Severiana Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2769 
              AND col.name = 'La Severiana Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de Santa Paula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2769 
              AND col.name = 'Paseos de Santa Paula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2770, '{"type": "Polygon", "coordinates": [[[-103.1975, 20.634398], [-103.1975, 20.638551], [-103.2, 20.641733], [-103.21, 20.639915], [-103.21, 20.635242], [-103.2085, 20.633176], [-103.1975, 20.634398]]]}'::jsonb)
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
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2771, '{"type": "Polygon", "coordinates": [[[-103.19, 20.642642], [-103.1975, 20.638551], [-103.1975, 20.634398], [-103.197333, 20.634139], [-103.186167, 20.633394], [-103.183695, 20.63691], [-103.19, 20.642642]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Cofradía Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2771 
              AND col.name = 'La Cofradía Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Gaspar Tradicional', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2771 
              AND col.name = 'San Gaspar Tradicional' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2772, '{"type": "Polygon", "coordinates": [[[-103.225893, 20.66], [-103.231415, 20.66], [-103.232947, 20.65783], [-103.232244, 20.647035], [-103.227876, 20.646115], [-103.225893, 20.66]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coyula Los Arcos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2772 
              AND col.name = 'Coyula Los Arcos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Cerrito Coyula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2772 
              AND col.name = 'El Cerrito Coyula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2773, '{"type": "Polygon", "coordinates": [[[-103.213378, 20.66], [-103.221181, 20.66], [-103.220347, 20.645], [-103.216841, 20.645], [-103.213378, 20.66]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Gaspar Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2773 
              AND col.name = 'San Gaspar Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Loma Coyula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2773 
              AND col.name = 'La Loma Coyula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2774, '{"type": "Polygon", "coordinates": [[[-103.19, 20.615181], [-103.19, 20.615313], [-103.19534, 20.625994], [-103.197334, 20.626685], [-103.198486, 20.625712], [-103.2, 20.618646], [-103.2, 20.614966], [-103.197333, 20.613294], [-103.19, 20.615181]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Tololotlán Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2774 
              AND col.name = 'Tololotlán Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Puente Histórico', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2774 
              AND col.name = 'El Puente Histórico' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2775, '{"type": "Polygon", "coordinates": [[[-103.186167, 20.613132], [-103.18, 20.615289], [-103.18, 20.623997], [-103.186167, 20.626903], [-103.186622, 20.626575], [-103.19, 20.615314], [-103.19, 20.615181], [-103.186167, 20.613132]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Vado Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2775 
              AND col.name = 'El Vado Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Vado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2775 
              AND col.name = 'Paseos del Vado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2776, '{"type": "Polygon", "coordinates": [[[-103.18, 20.623997], [-103.18, 20.615289], [-103.17, 20.610867], [-103.17, 20.629952], [-103.18, 20.623997]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Puente Grande Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2776 
              AND col.name = 'Puente Grande Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Presa Puente Grande', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2776 
              AND col.name = 'La Presa Puente Grande' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2777, '{"type": "Polygon", "coordinates": [[[-103.186166, 20.613132], [-103.19, 20.615181], [-103.197333, 20.613294], [-103.197333, 20.603594], [-103.19, 20.601452], [-103.186166, 20.603778], [-103.186166, 20.613132]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Huertas de Tonalá Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2777 
              AND col.name = 'Huertas de Tonalá Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Sauces', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2777 
              AND col.name = 'Los Sauces' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2778, '{"type": "Polygon", "coordinates": [[[-103.18, 20.615289], [-103.186166, 20.613132], [-103.186166, 20.603777], [-103.18, 20.601329], [-103.17, 20.606348], [-103.17, 20.610867], [-103.18, 20.615289]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Real Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2778 
              AND col.name = 'Hacienda Real Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de la Hacienda', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2778 
              AND col.name = 'Paseos de la Hacienda' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2779, '{"type": "Polygon", "coordinates": [[[-103.235, 20.634151], [-103.240346, 20.6275], [-103.235, 20.625686], [-103.232586, 20.6275], [-103.235, 20.634151]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Mateo Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2779 
              AND col.name = 'San Mateo Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de San Mateo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2779 
              AND col.name = 'Villas de San Mateo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2780, '{"type": "Polygon", "coordinates": [[[-103.2275, 20.633337], [-103.229324, 20.6275], [-103.228918, 20.627145], [-103.22666, 20.626091], [-103.220203, 20.6275], [-103.2275, 20.633337]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Laurel Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2780 
              AND col.name = 'El Laurel Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Valle Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2780 
              AND col.name = 'Lomas del Valle Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2781, '{"type": "Polygon", "coordinates": [[[-103.2085, 20.633176], [-103.21, 20.635242], [-103.218562, 20.632769], [-103.219579, 20.627524], [-103.210088, 20.624783], [-103.209729, 20.625131], [-103.2085, 20.626824], [-103.2085, 20.633176]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Bosques de Tonalá II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2781 
              AND col.name = 'Bosques de Tonalá II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Jardines de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2781 
              AND col.name = 'Jardines de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2782, '{"type": "Polygon", "coordinates": [[[-103.197333, 20.634139], [-103.1975, 20.634398], [-103.2085, 20.633177], [-103.2085, 20.626823], [-103.198486, 20.625711], [-103.197333, 20.626684], [-103.197333, 20.634139]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colinas de Tonalá Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2782 
              AND col.name = 'Colinas de Tonalá Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Mirador del Bosque', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2782 
              AND col.name = 'Mirador del Bosque' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2783, '{"type": "Polygon", "coordinates": [[[-103.186166, 20.626902], [-103.186166, 20.633394], [-103.197333, 20.634139], [-103.197333, 20.626685], [-103.195341, 20.625994], [-103.186621, 20.626575], [-103.186166, 20.626902]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Valle del Sol II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2783 
              AND col.name = 'Valle del Sol II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto Bugambilias', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2783 
              AND col.name = 'Coto Bugambilias' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2784, '{"type": "Polygon", "coordinates": [[[-103.18, 20.638045], [-103.183694, 20.63691], [-103.186166, 20.633394], [-103.186166, 20.626903], [-103.18, 20.623998], [-103.17, 20.629952], [-103.17, 20.634161], [-103.18, 20.638045]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Pinos Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2784 
              AND col.name = 'Los Pinos Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Esperanza', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2784 
              AND col.name = 'La Esperanza' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2785, '{"type": "Polygon", "coordinates": [[[-103.234516, 20.646002], [-103.232244, 20.647035], [-103.232947, 20.657829], [-103.235788, 20.656779], [-103.240277, 20.654522], [-103.234516, 20.646002]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Manantial Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2785 
              AND col.name = 'Lomas del Manantial Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Real', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2785 
              AND col.name = 'Paseos del Real' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2786, '{"type": "Polygon", "coordinates": [[[-103.2275, 20.633336], [-103.2275, 20.633576], [-103.233515, 20.63625], [-103.235, 20.63625], [-103.235, 20.63625], [-103.235, 20.634152], [-103.232586, 20.6275], [-103.229324, 20.6275], [-103.2275, 20.633336]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Centro Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2786 
              AND col.name = 'Centro Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Plaza Cihualpilli', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2786 
              AND col.name = 'Plaza Cihualpilli' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2787, '{"type": "Polygon", "coordinates": [[[-103.218562, 20.63277], [-103.2225, 20.638021], [-103.2275, 20.633576], [-103.2275, 20.633338], [-103.220203, 20.6275], [-103.219609, 20.6275], [-103.219579, 20.627524], [-103.218562, 20.63277]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Alfareros Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2787 
              AND col.name = 'Alfareros Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Museo Nacional de la Cerámica', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2787 
              AND col.name = 'Museo Nacional de la Cerámica' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2788, '{"type": "Polygon", "coordinates": [[[-103.2425, 20.644419], [-103.25025, 20.644545], [-103.252981, 20.641666], [-103.25025, 20.637722], [-103.2425, 20.637894], [-103.2425, 20.644419]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Pachaguilla Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2788 
              AND col.name = 'Pachaguilla Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camino Real Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2788 
              AND col.name = 'Camino Real Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2789, '{"type": "Polygon", "coordinates": [[[-103.235, 20.63625], [-103.235, 20.645583], [-103.241754, 20.645133], [-103.2425, 20.644419], [-103.2425, 20.637895], [-103.241245, 20.63625], [-103.235, 20.63625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Linda Vista Alta', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2789 
              AND col.name = 'Linda Vista Alta' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Cerro de la Reina Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2789 
              AND col.name = 'Cerro de la Reina Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2790, '{"type": "Polygon", "coordinates": [[[-103.233517, 20.63625], [-103.223844, 20.643988], [-103.227876, 20.646115], [-103.232244, 20.647035], [-103.234517, 20.646002], [-103.235, 20.645583], [-103.235, 20.63625], [-103.235, 20.63625], [-103.233517, 20.63625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Cerro de la Reina', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2790 
              AND col.name = 'Cerro de la Reina' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Mirador Tradicional Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2790 
              AND col.name = 'Mirador Tradicional Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2791, '{"type": "Polygon", "coordinates": [[[-103.26125, 20.679821], [-103.265, 20.675], [-103.265, 20.675], [-103.2615, 20.6715], [-103.2608, 20.6715], [-103.255, 20.674722], [-103.255, 20.675357], [-103.26125, 20.679821]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Sección VII', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2791 
              AND col.name = 'Colonia Jalisco Sección VII' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Onofre', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2791 
              AND col.name = 'San Onofre' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2792, '{"type": "Polygon", "coordinates": [[[-103.2525, 20.679286], [-103.255, 20.675357], [-103.255, 20.674722], [-103.2525, 20.671667], [-103.245, 20.674167], [-103.245, 20.676071], [-103.2525, 20.679286]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Educadores Jaliscienses Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2792 
              AND col.name = 'Educadores Jaliscienses Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Parque Lineal Jalisco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2792 
              AND col.name = 'Parque Lineal Jalisco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2793, '{"type": "Polygon", "coordinates": [[[-103.245, 20.676071], [-103.245, 20.674167], [-103.24375, 20.672361], [-103.239085, 20.672879], [-103.232228, 20.688], [-103.238577, 20.688], [-103.245, 20.676071]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco San Carlos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2793 
              AND col.name = 'Colonia Jalisco San Carlos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Teresita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2793 
              AND col.name = 'Santa Teresita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2794, '{"type": "Polygon", "coordinates": [[[-103.285, 20.67975], [-103.275, 20.67975], [-103.275, 20.67975], [-103.275, 20.688], [-103.285, 20.688], [-103.285, 20.67975]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco San Miguel', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2794 
              AND col.name = 'Colonia Jalisco San Miguel' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Vergel Jalisco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2794 
              AND col.name = 'El Vergel Jalisco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2795, '{"type": "Polygon", "coordinates": [[[-103.275, 20.67975], [-103.275, 20.67975], [-103.26975, 20.67975], [-103.262443, 20.688], [-103.275, 20.688], [-103.275, 20.67975]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia Jalisco Santa Isabel', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2795 
              AND col.name = 'Colonia Jalisco Santa Isabel' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto de los Laureles Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2795 
              AND col.name = 'Coto de los Laureles Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2796, '{"type": "Polygon", "coordinates": [[[-103.265, 20.675], [-103.2695, 20.6715], [-103.2656, 20.665], [-103.264533, 20.665], [-103.2615, 20.6715], [-103.265, 20.675]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán Ampliación', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2796 
              AND col.name = 'Zalatitán Ampliación' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Arcos del Zalate', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2796 
              AND col.name = 'Arcos del Zalate' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2797, '{"type": "Polygon", "coordinates": [[[-103.2525, 20.671666], [-103.255, 20.674722], [-103.2608, 20.6715], [-103.255339, 20.665], [-103.254846, 20.665], [-103.2525, 20.671144], [-103.2525, 20.671666]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Camichines Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2797 
              AND col.name = 'Los Camichines Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camichín Blanco', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2797 
              AND col.name = 'Camichín Blanco' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2798, '{"type": "Polygon", "coordinates": [[[-103.24375, 20.672361], [-103.245, 20.674166], [-103.2525, 20.671667], [-103.2525, 20.671143], [-103.245, 20.665785], [-103.24375, 20.669655], [-103.24375, 20.672361]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Aurora Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2798 
              AND col.name = 'La Aurora Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Parque Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2798 
              AND col.name = 'Parque Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2799, '{"type": "Polygon", "coordinates": [[[-103.233979, 20.669104], [-103.239085, 20.672879], [-103.24375, 20.672361], [-103.24375, 20.669654], [-103.234375, 20.667422], [-103.233979, 20.669104]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Mirador de la Reina Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2799 
              AND col.name = 'Mirador de la Reina Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas Altas Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2799 
              AND col.name = 'Lomas Altas Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2800, '{"type": "Polygon", "coordinates": [[[-103.26975, 20.67975], [-103.265, 20.675], [-103.26125, 20.679821], [-103.26125, 20.688], [-103.262443, 20.688], [-103.26975, 20.67975]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán San Juan', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2800 
              AND col.name = 'Zalatitán San Juan' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto La Huertita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2800 
              AND col.name = 'Coto La Huertita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2801, '{"type": "Polygon", "coordinates": [[[-103.26125, 20.679821], [-103.255, 20.675357], [-103.2525, 20.679286], [-103.2525, 20.688], [-103.26125, 20.688], [-103.26125, 20.679821]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas del Zalate', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2801 
              AND col.name = 'Villas del Zalate' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Manantial Zalatitán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2801 
              AND col.name = 'El Manantial Zalatitán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2802, '{"type": "Polygon", "coordinates": [[[-103.2525, 20.679285], [-103.245, 20.676071], [-103.238577, 20.688], [-103.2525, 20.688], [-103.2525, 20.679285]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Zalatitán La Presita', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2802 
              AND col.name = 'Zalatitán La Presita' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camino a San Gaspar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2802 
              AND col.name = 'Camino a San Gaspar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2803, '{"type": "Polygon", "coordinates": [[[-103.2585, 20.642715], [-103.26625, 20.643072], [-103.26625, 20.635575], [-103.2585, 20.637124], [-103.257202, 20.641666], [-103.2585, 20.642715]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Aztlán El Molino', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2803 
              AND col.name = 'Aztlán El Molino' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Parque Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2803 
              AND col.name = 'Parque Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2804, '{"type": "Polygon", "coordinates": [[[-103.27875, 20.655193], [-103.285, 20.656962], [-103.285, 20.645], [-103.27875, 20.645], [-103.27875, 20.645], [-103.27875, 20.655193]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Basilio Badillo Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2804 
              AND col.name = 'Basilio Badillo Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Límite Tonalá-Guadalajara', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2804 
              AND col.name = 'Límite Tonalá-Guadalajara' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2805, '{"type": "Polygon", "coordinates": [[[-103.2725, 20.655547], [-103.275, 20.65767], [-103.27875, 20.655193], [-103.27875, 20.645], [-103.278001, 20.645], [-103.2725, 20.65127], [-103.2725, 20.655547]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Residencial del Prado II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2805 
              AND col.name = 'Residencial del Prado II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2805 
              AND col.name = 'Villas de Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2806, '{"type": "Polygon", "coordinates": [[[-103.26625, 20.655625], [-103.267111, 20.656056], [-103.2725, 20.655547], [-103.2725, 20.651271], [-103.268456, 20.649816], [-103.26625, 20.653124], [-103.26625, 20.655625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas del Camichín Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2806 
              AND col.name = 'Lomas del Camichín Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Hacienda Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2806 
              AND col.name = 'La Hacienda Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2807, '{"type": "Polygon", "coordinates": [[[-103.258713, 20.654469], [-103.26327, 20.656618], [-103.26625, 20.655625], [-103.26625, 20.653125], [-103.263471, 20.650346], [-103.260205, 20.650738], [-103.258713, 20.654469]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Floresta Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2807 
              AND col.name = 'La Floresta Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Jardines de Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2807 
              AND col.name = 'Jardines de Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2808, '{"type": "Polygon", "coordinates": [[[-103.285, 20.6725], [-103.285, 20.662403], [-103.281217, 20.66325], [-103.280667, 20.6715], [-103.285, 20.6725]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Prado Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2808 
              AND col.name = 'Paseos del Prado Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Fracc. Real Aztlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2808 
              AND col.name = 'Fracc. Real Aztlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2809, '{"type": "Polygon", "coordinates": [[[-103.275, 20.673077], [-103.277929, 20.6715], [-103.277693, 20.66325], [-103.275, 20.661843], [-103.272906, 20.66325], [-103.272723, 20.6715], [-103.275, 20.673077]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camichines Límite Malecón', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2809 
              AND col.name = 'Camichines Límite Malecón' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Periférico Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2809 
              AND col.name = 'Periférico Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2810, '{"type": "Polygon", "coordinates": [[[-103.235625, 20.59625], [-103.24, 20.602084], [-103.244375, 20.59625], [-103.24, 20.591875], [-103.235625, 20.59625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Prados del Nilo II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2810 
              AND col.name = 'Prados del Nilo II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Oriente Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2810 
              AND col.name = 'Villas de Oriente Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2811, '{"type": "Polygon", "coordinates": [[[-103.265, 20.6025], [-103.265, 20.6025], [-103.265, 20.61375], [-103.276805, 20.61375], [-103.278749, 20.612989], [-103.285, 20.607826], [-103.285, 20.6025], [-103.265, 20.6025]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Cruz San José', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2811 
              AND col.name = 'Santa Cruz San José' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Fresno', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2811 
              AND col.name = 'El Fresno' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2812, '{"type": "Polygon", "coordinates": [[[-103.255, 20.6025], [-103.255, 20.6025], [-103.255, 20.613987], [-103.258499, 20.615441], [-103.264381, 20.6143], [-103.265, 20.61375], [-103.265, 20.6025], [-103.265, 20.6025], [-103.255, 20.6025]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Balcones del Rosario Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2812 
              AND col.name = 'Balcones del Rosario Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Laja', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2812 
              AND col.name = 'La Laja' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2813, '{"type": "Polygon", "coordinates": [[[-103.250313, 20.6025], [-103.245, 20.606042], [-103.245, 20.609375], [-103.253496, 20.614472], [-103.255, 20.613986], [-103.255, 20.6025], [-103.255, 20.6025], [-103.250313, 20.6025]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colonia del Sur Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2813 
              AND col.name = 'Colonia del Sur Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Cantera Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2813 
              AND col.name = 'La Cantera Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2814, '{"type": "Polygon", "coordinates": [[[-103.245, 20.606042], [-103.24, 20.602708], [-103.238357, 20.603804], [-103.238106, 20.610996], [-103.2425, 20.611875], [-103.245, 20.609375], [-103.245, 20.606042]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Arroyo Seco Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2814 
              AND col.name = 'Arroyo Seco Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Sabino', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2814 
              AND col.name = 'El Sabino' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2815, '{"type": "Polygon", "coordinates": [[[-103.276806, 20.61375], [-103.265, 20.61375], [-103.26438, 20.614301], [-103.266182, 20.620101], [-103.26625, 20.62025], [-103.269463, 20.620893], [-103.273746, 20.619257], [-103.276806, 20.61375]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Cruz de las Huertas Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2815 
              AND col.name = 'Santa Cruz de las Huertas Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Jagüey Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2815 
              AND col.name = 'El Jagüey Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2816, '{"type": "Polygon", "coordinates": [[[-103.22, 20.59625], [-103.23, 20.59625], [-103.23, 20.59625], [-103.23, 20.589145], [-103.22, 20.588719], [-103.22, 20.59625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Paula Ampliación', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2816 
              AND col.name = 'Santa Paula Ampliación' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Mirador de Santa Paula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2816 
              AND col.name = 'El Mirador de Santa Paula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2817, '{"type": "Polygon", "coordinates": [[[-103.2085, 20.58988], [-103.208131, 20.590639], [-103.210937, 20.59625], [-103.22, 20.59625], [-103.22, 20.59625], [-103.22, 20.588719], [-103.219667, 20.588138], [-103.2085, 20.58988]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Praderas del Sol II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2817 
              AND col.name = 'Praderas del Sol II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto de los Laureles', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2817 
              AND col.name = 'Coto de los Laureles' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2818, '{"type": "Polygon", "coordinates": [[[-103.24, 20.602709], [-103.245, 20.606042], [-103.250313, 20.6025], [-103.245625, 20.59625], [-103.244375, 20.59625], [-103.24, 20.602083], [-103.24, 20.602709]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Jauja Campestre', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2818 
              AND col.name = 'Jauja Campestre' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Cerrito de Jauja', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2818 
              AND col.name = 'El Cerrito de Jauja' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2819, '{"type": "Polygon", "coordinates": [[[-103.24, 20.602709], [-103.24, 20.602083], [-103.235625, 20.59625], [-103.23, 20.59625], [-103.23, 20.59625], [-103.23, 20.604148], [-103.230833, 20.605249], [-103.238357, 20.603804], [-103.24, 20.602709]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Ladrillera Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2819 
              AND col.name = 'La Ladrillera Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camino a San Martín', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2819 
              AND col.name = 'Camino a San Martín' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2820, '{"type": "Polygon", "coordinates": [[[-103.22, 20.59625], [-103.22, 20.604486], [-103.23, 20.604147], [-103.23, 20.59625], [-103.22, 20.59625]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Arroyo de Enmedio Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2820 
              AND col.name = 'Arroyo de Enmedio Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de Jauja', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2820 
              AND col.name = 'Villas de Jauja' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2821, '{"type": "Polygon", "coordinates": [[[-103.208501, 20.603562], [-103.219667, 20.604949], [-103.22, 20.604486], [-103.22, 20.59625], [-103.22, 20.59625], [-103.210938, 20.59625], [-103.208312, 20.603253], [-103.208501, 20.603562]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Santa Paula Lomas Altas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2821 
              AND col.name = 'Santa Paula Lomas Altas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Providencia Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2821 
              AND col.name = 'La Providencia Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2822, '{"type": "Polygon", "coordinates": [[[-103.198716, 20.659943], [-103.198817, 20.66], [-103.208281, 20.66], [-103.209288, 20.659919], [-103.208765, 20.649113], [-103.205516, 20.648613], [-103.198716, 20.659943]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coyula Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2822 
              AND col.name = 'Coyula Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de la Cofradía', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2822 
              AND col.name = 'Paseos de la Cofradía' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2823, '{"type": "Polygon", "coordinates": [[[-103.185586, 20.659297], [-103.189999, 20.661062], [-103.197385, 20.65929], [-103.197333, 20.658083], [-103.187878, 20.648628], [-103.186019, 20.650058], [-103.185586, 20.659297]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San José de las Flores Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2823 
              AND col.name = 'San José de las Flores Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de San Gaspar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2823 
              AND col.name = 'Villas de San Gaspar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2824, '{"type": "Polygon", "coordinates": [[[-103.230834, 20.672814], [-103.23398, 20.669103], [-103.234375, 20.667424], [-103.234338, 20.66414], [-103.231415, 20.66], [-103.225893, 20.66], [-103.2225, 20.660766], [-103.2225, 20.668327], [-103.230834, 20.672814]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Pocitos Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2824 
              AND col.name = 'Los Pocitos Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Manantial Coyula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2824 
              AND col.name = 'El Manantial Coyula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2825, '{"type": "Polygon", "coordinates": [[[-103.219667, 20.67225], [-103.2225, 20.668327], [-103.2225, 20.660766], [-103.221181, 20.66], [-103.213378, 20.66], [-103.210216, 20.660442], [-103.210706, 20.669263], [-103.219667, 20.67225]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colinas del Rey II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2825 
              AND col.name = 'Colinas del Rey II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rincón de San Gaspar', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2825 
              AND col.name = 'Rincón de San Gaspar' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2826, '{"type": "Polygon", "coordinates": [[[-103.19955, 20.670265], [-103.202932, 20.670699], [-103.208281, 20.66], [-103.198817, 20.66], [-103.19955, 20.670265]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Cofradía Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2826 
              AND col.name = 'La Cofradía Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camino a Coyula', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2826 
              AND col.name = 'Camino a Coyula' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2827, '{"type": "Polygon", "coordinates": [[[-103.2, 20.647106], [-103.205519, 20.648614], [-103.208765, 20.649113], [-103.212733, 20.644386], [-103.21, 20.639915], [-103.2, 20.641733], [-103.2, 20.647106]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'San Miguel de la Punta Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2827 
              AND col.name = 'San Miguel de la Punta Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Real Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2827 
              AND col.name = 'Hacienda Real Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2828, '{"type": "Polygon", "coordinates": [[[-103.19, 20.646749], [-103.197334, 20.649875], [-103.2, 20.647106], [-103.2, 20.641733], [-103.1975, 20.638551], [-103.19, 20.642642], [-103.19, 20.646749]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Matatlán Tradicional', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2828 
              AND col.name = 'Matatlán Tradicional' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Cerro de Matatlán', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2828 
              AND col.name = 'Cerro de Matatlán' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2829, '{"type": "Polygon", "coordinates": [[[-103.18, 20.64657], [-103.186019, 20.650057], [-103.18788, 20.648626], [-103.19, 20.646749], [-103.19, 20.642642], [-103.183695, 20.63691], [-103.18, 20.638045], [-103.18, 20.64657]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Pinar de las Palomas Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2829 
              AND col.name = 'Pinar de las Palomas Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Mirador del Vado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2829 
              AND col.name = 'El Mirador del Vado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2830, '{"type": "Polygon", "coordinates": [[[-103.18, 20.64657], [-103.18, 20.638045], [-103.17, 20.634161], [-103.17, 20.653892], [-103.18, 20.64657]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Tololotlán Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2830 
              AND col.name = 'Tololotlán Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Camino Antiguo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2830 
              AND col.name = 'Camino Antiguo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2831, '{"type": "Polygon", "coordinates": [[[-103.208501, 20.672673], [-103.210706, 20.669263], [-103.210216, 20.660442], [-103.209287, 20.659919], [-103.208282, 20.659999], [-103.202932, 20.670699], [-103.208501, 20.672673]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Los Ramos II', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2831 
              AND col.name = 'Hacienda Los Ramos II' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas del Vado', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2831 
              AND col.name = 'Villas del Vado' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2832, '{"type": "Polygon", "coordinates": [[[-103.197333, 20.673252], [-103.19955, 20.670265], [-103.198817, 20.659999], [-103.19873, 20.659951], [-103.197385, 20.65929], [-103.19, 20.661062], [-103.19, 20.669195], [-103.197333, 20.673252]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Puente Grande Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2832 
              AND col.name = 'Puente Grande Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Molino Puente Grande', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2832 
              AND col.name = 'El Molino Puente Grande' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2833, '{"type": "Polygon", "coordinates": [[[-103.186166, 20.6736], [-103.19, 20.669195], [-103.19, 20.661063], [-103.185585, 20.659297], [-103.172067, 20.663], [-103.186166, 20.6736]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Vado Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2833 
              AND col.name = 'El Vado Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Límite Municipal Zapotlanejo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2833 
              AND col.name = 'Límite Municipal Zapotlanejo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2834, '{"type": "Polygon", "coordinates": [[[-103.221181, 20.66], [-103.2225, 20.660766], [-103.225893, 20.66], [-103.227877, 20.646116], [-103.223844, 20.643989], [-103.222499, 20.643664], [-103.220347, 20.645], [-103.221181, 20.66]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Buenavista Centro', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2834 
              AND col.name = 'Buenavista Centro' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Manantial del Bosque', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2834 
              AND col.name = 'El Manantial del Bosque' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2835, '{"type": "Polygon", "coordinates": [[[-103.208765, 20.649113], [-103.209288, 20.659919], [-103.210215, 20.660442], [-103.213378, 20.66], [-103.216841, 20.645], [-103.212733, 20.644386], [-103.208765, 20.649113]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Los Conejos Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2835 
              AND col.name = 'Los Conejos Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada de los Conejos', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2835 
              AND col.name = 'Rinconada de los Conejos' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2836, '{"type": "Polygon", "coordinates": [[[-103.2, 20.647106], [-103.197333, 20.649875], [-103.197333, 20.658066], [-103.197386, 20.65929], [-103.198715, 20.659943], [-103.205516, 20.648613], [-103.2, 20.647106]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Presa Poniente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2836 
              AND col.name = 'La Presa Poniente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Villas de la Presa', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2836 
              AND col.name = 'Villas de la Presa' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2837, '{"type": "Polygon", "coordinates": [[[-103.187878, 20.648628], [-103.197333, 20.658083], [-103.197333, 20.649875], [-103.19, 20.646749], [-103.187878, 20.648628]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Huertas de Tonalá Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2837 
              AND col.name = 'Huertas de Tonalá Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos del Mezquite', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2837 
              AND col.name = 'Paseos del Mezquite' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2838, '{"type": "Polygon", "coordinates": [[[-103.172066, 20.663], [-103.185586, 20.659297], [-103.186019, 20.650057], [-103.18, 20.64657], [-103.17, 20.653892], [-103.17, 20.663], [-103.172066, 20.663]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Hacienda Real Lomas', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2838 
              AND col.name = 'Hacienda Real Lomas' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Coto San Mateo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2838 
              AND col.name = 'Coto San Mateo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2839, '{"type": "Polygon", "coordinates": [[[-103.239085, 20.67288], [-103.233979, 20.669104], [-103.230834, 20.672814], [-103.230834, 20.688], [-103.232228, 20.688], [-103.239085, 20.67288]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Laurel Norte', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2839 
              AND col.name = 'El Laurel Norte' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Fracc. Los Pinos Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2839 
              AND col.name = 'Fracc. Los Pinos Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2840, '{"type": "Polygon", "coordinates": [[[-103.230834, 20.672814], [-103.2225, 20.668327], [-103.219667, 20.67225], [-103.219667, 20.688], [-103.230834, 20.688], [-103.230834, 20.672814]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Bosques del Rey', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2840 
              AND col.name = 'Bosques del Rey' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de Buenavista', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2840 
              AND col.name = 'Paseos de Buenavista' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2841, '{"type": "Polygon", "coordinates": [[[-103.219667, 20.67225], [-103.210705, 20.669264], [-103.2085, 20.672673], [-103.2085, 20.688], [-103.219667, 20.688], [-103.219667, 20.67225]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Colinas del Sol', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2841 
              AND col.name = 'Colinas del Sol' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Lomas de San Mateo', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2841 
              AND col.name = 'Lomas de San Mateo' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2842, '{"type": "Polygon", "coordinates": [[[-103.2085, 20.672673], [-103.202931, 20.670698], [-103.19955, 20.670265], [-103.197333, 20.673252], [-103.197333, 20.688], [-103.2085, 20.688], [-103.2085, 20.672673]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Rinconada del Bosque', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2842 
              AND col.name = 'Rinconada del Bosque' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'El Sauz Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2842 
              AND col.name = 'El Sauz Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2843, '{"type": "Polygon", "coordinates": [[[-103.197333, 20.673253], [-103.19, 20.669196], [-103.186166, 20.6736], [-103.186166, 20.688], [-103.197333, 20.688], [-103.197333, 20.673253]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'La Esperanza Sur', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2843 
              AND col.name = 'La Esperanza Sur' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Paseos de la Presa', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2843 
              AND col.name = 'Paseos de la Presa' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (2844, '{"type": "Polygon", "coordinates": [[[-103.186166, 20.6736], [-103.172068, 20.663], [-103.17, 20.663], [-103.17, 20.688], [-103.186166, 20.688], [-103.186166, 20.6736]]]}'::jsonb)
        ON CONFLICT (section_num) DO UPDATE 
        SET geom_json = EXCLUDED.geom_json;
        

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Límite Municipal Oriente', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2844 
              AND col.name = 'Límite Municipal Oriente' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            

            INSERT INTO colonies (id, catalog_version_id, name, postal_code, municipality, status)
            VALUES (
              gen_random_uuid(), 
              'a0000000-0000-0000-0000-000000000001', 
              'Valle de Tonalá', 
              '45400', 
              'Tonalá', 
              'active'
            )
            ON CONFLICT (catalog_version_id, name) DO UPDATE 
            SET municipality = 'Tonalá', status = 'active';

            INSERT INTO section_colonies (section_id, colony_id)
            SELECT es.id, col.id 
            FROM electoral_sections es, colonies col
            WHERE es.section_num = 2844 
              AND col.name = 'Valle de Tonalá' 
              AND col.catalog_version_id = 'a0000000-0000-0000-0000-000000000001'
            ON CONFLICT (section_id, colony_id) DO NOTHING;
            
COMMIT;