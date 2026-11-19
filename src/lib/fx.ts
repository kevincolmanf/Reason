// Cotización oficial USD/ARS — aislada en su propio archivo porque viene de
// un servicio externo (dolarapi.com, trackea el oficial del BCRA): si el día
// de mañana hay que cambiar de fuente, es un solo lugar para tocar.
export async function getOficialArsRate(): Promise<{ venta: number; source: 'dolarapi' }> {
  const res = await fetch('https://dolarapi.com/v1/dolares/oficial', { cache: 'no-store' })
  if (!res.ok) throw new Error('No se pudo obtener la cotización oficial')
  const data = await res.json()
  if (typeof data.venta !== 'number') throw new Error('Respuesta inesperada de la cotización')
  return { venta: data.venta, source: 'dolarapi' }
}
