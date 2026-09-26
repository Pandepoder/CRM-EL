-- M3: el rol `capturist` se mostraba como «Coordinador Territorial» mientras `territorial_coordinator`
-- se mostraba como «Líder». En campo, «el coordinador territorial» no coordinaba nada: capturaba.
-- Pasa a llamarse por lo que hace. Solo cambia el nombre visible (`roles.name`); la clave, los
-- permisos y quién tiene el rol no se tocan.
--
-- Solo si conserva el nombre de fábrica: si alguien ya lo había renombrado a mano, se respeta.
-- Escrita a mano, como todas desde la 0019 (ver D6 en docs/PLAN_ADMIN_MUNICIPAL.md).
UPDATE roles SET name = 'Capturista' WHERE key = 'capturist' AND name = 'Coordinador Territorial';
