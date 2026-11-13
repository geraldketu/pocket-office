// Existing production interview-rules.ts prices, not archived Worker pricing.
export const approvedServicePricing=[
 {key:'USDOT registration assistance',en:'USDOT registration assistance (standalone)',es:'Asistencia con registro USDOT (individual)',cents:2500,note:'Agency requirements and outside fees are reviewed separately.'},
 {key:'UCR filing assistance',en:'UCR filing assistance service fee',es:'Cargo de asistencia con presentación UCR',cents:0,note:'UCR registration charges are separate; this is the assistance fee only.'},
 {key:'IFTA setup assistance',en:'IFTA setup assistance service fee',es:'Cargo de asistencia con configuración de IFTA',cents:0,note:'Licenses, decals, taxes and other outside costs are not assumed included.'},
 {key:'Driver qualification files',en:'DQF preparation per driver',es:'Preparación de DQF por conductor',cents:9999,note:'Driver quantity and exact preparation scope require owner review.'},
 {key:'Startup bundle',en:'Startup Bundle service fee',es:'Cargo de servicios del Startup Bundle',cents:125000,note:'Package scope and all government/third-party fees remain subject to owner review. Standalone USDOT assistance is not charged again when included in this bundle.'}
] as const;
