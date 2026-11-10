// Áreas por defecto para una agenda sin configurar (agenda_areas = null en
// users/organizations). Antes esto tenía hardcodeadas las áreas reales del
// centro de Build (Kinesiología, RPG, Nutrición, etc.) como fallback — un
// centro nuevo las veía, y si guardaba configuración (o tocaba "Restablecer")
// quedaban grabadas tal cual en su propia fila. El default genérico evita eso:
// cada centro arranca con un área propia para renombrar o ampliar.
export const DEFAULT_AREAS = ['Nueva agenda']
