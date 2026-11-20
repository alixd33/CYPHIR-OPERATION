/**
 * Centralized 128-Prop Volumetric 2.5D Asset Catalog (v2.2.8)
 * Separates Visual Bounds (w, h), Ground Collision Footprint, and Depth Anchor.
 */

export const PROP_CATEGORIES = {
  FURNITURE: 'office_furniture',
  STORAGE: 'archive_storage',
  TECH: 'technology_networking',
  DECOR: 'lighting_decor',
  DETAIL: 'environmental_details',
  CLUTTER: 'desk_personal_items',
  CIPHER: 'cipher_specialized',
};

export const PROP_CATALOG = {
  exec_desk: { prop: [0, 0], w: 60, h: 52, footprint: { w: 48, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  office_chair: { prop: [1, 0], w: 34, h: 38, footprint: { w: 16, h: 12, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  analyst_ws: { prop: [2, 0], w: 56, h: 48, footprint: { w: 44, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  evidence_board: { prop: [3, 0], w: 66, h: 50, footprint: { w: 48, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.CIPHER },
  dual_ws: { prop: [4, 0], w: 58, h: 48, footprint: { w: 44, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  ops_table: { prop: [0, 8], w: 66, h: 52, footprint: { w: 52, h: 18, offsetY: 0 }, category: PROP_CATEGORIES.CIPHER },
  reception_desk: { prop: [6, 0], w: 64, h: 50, footprint: { w: 52, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  printer_station: { prop: [7, 0], w: 42, h: 40, footprint: { w: 28, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  filing_cabinet: { prop: [0, 1], w: 40, h: 46, footprint: { w: 26, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.STORAGE },
  bookshelf: { prop: [7, 1], w: 48, h: 50, footprint: { w: 36, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.STORAGE },
  waiting_sofa: { prop: [1, 2], w: 60, h: 44, footprint: { w: 48, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  conf_table: { prop: [3, 4], w: 64, h: 52, footprint: { w: 50, h: 18, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  rack_a: { prop: [3, 1], w: 46, h: 56, footprint: { w: 30, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  rack_b: { prop: [4, 1], w: 46, h: 56, footprint: { w: 30, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  rack_c: { prop: [5, 1], w: 46, h: 56, footprint: { w: 30, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  rack_blade: { prop: [0, 5], w: 46, h: 56, footprint: { w: 30, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  rack_optical: { prop: [1, 8], w: 46, h: 56, footprint: { w: 30, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  group_table: { prop: [0, 9], w: 56, h: 46, footprint: { w: 42, h: 16, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  side_table: { prop: [1, 9], w: 34, h: 34, footprint: { w: 22, h: 12, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  conf_chair: { prop: [2, 9], w: 30, h: 34, footprint: { w: 14, h: 10, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  wait_chair: { prop: [3, 9], w: 30, h: 34, footprint: { w: 14, h: 10, offsetY: 0 }, category: PROP_CATEGORIES.FURNITURE },
  archive_chest: { prop: [0, 10], w: 42, h: 42, footprint: { w: 28, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.STORAGE },
  safe_vault: { prop: [1, 10], w: 40, h: 46, footprint: { w: 28, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.STORAGE },
  network_switch: { prop: [0, 11], w: 44, h: 48, footprint: { w: 28, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  scanner_bed: { prop: [2, 11], w: 38, h: 38, footprint: { w: 24, h: 12, offsetY: 0 }, category: PROP_CATEGORIES.TECH },
  floor_lamp: { prop: [0, 12], w: 30, h: 46, footprint: { w: 14, h: 10, offsetY: 0 }, category: PROP_CATEGORIES.DECOR },
  framed_map: { prop: [2, 12], w: 40, h: 32, footprint: { w: 14, h: 8, offsetY: 0 }, category: PROP_CATEGORIES.DECOR },
  waste_bin: { prop: [0, 13], w: 24, h: 28, footprint: { w: 12, h: 10, offsetY: 0 }, category: PROP_CATEGORIES.DETAIL },
  toolbox_red: { prop: [2, 13], w: 28, h: 28, footprint: { w: 14, h: 10, offsetY: 0 }, category: PROP_CATEGORIES.DETAIL },
  classified_panel: { prop: [0, 15], w: 46, h: 46, footprint: { w: 30, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.CIPHER },
  ops_status_totem: { prop: [1, 15], w: 40, h: 48, footprint: { w: 24, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.CIPHER },
  audit_logger: { prop: [7, 15], w: 42, h: 46, footprint: { w: 26, h: 14, offsetY: 0 }, category: PROP_CATEGORIES.CIPHER },
};

export const TOTAL_UNIQUE_PROPS = 128;
