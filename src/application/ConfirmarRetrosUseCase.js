const redondear = n => Math.round(n * 100) / 100
const num = v => (v === null || v === undefined || v === '') ? null : Number(v)

/**
 * Guarda los retros que el usuario confirmó.
 * Del cliente solo se toma el resultado del recálculo; todo lo demás
 * (original, importe de sueldos, retros previos) se vuelve a leer de la DB,
 * y la diferencia/pendiente se recalcula acá para evitar duplicados.
 */
class ConfirmarRetrosUseCase {

    constructor(repositorioCierres) {
        this.repo = repositorioCierres
    }

    async ejecutar({ cierreId, items, usuario }) {
        const cierre = await this.repo.obtenerCierre(cierreId)
        if (!cierre) throw new Error('Cierre no encontrado.')

        const originales = await this.repo.obtenerResultadosCierre(cierreId)
        const previos = await this.repo.obtenerRetrosPorCierre(cierreId)
        const porId = new Map(originales.map(o => [o.id, o]))

        const guardados = []
        const omitidos = []

        for (const item of items) {
            const orig = porId.get(item.resultado_id)
            if (!orig) { omitidos.push({ resultado_id: item.resultado_id, motivo: 'No pertenece al cierre' }); continue }

            const rec = item.recalculado
            if (!rec || num(rec.porcentaje) === null || num(rec.dias) === null || num(rec.importe) === null) {
                omitidos.push({ resultado_id: item.resultado_id, motivo: 'Datos de recálculo incompletos' }); continue
            }

            const detalle = typeof orig.detalle === 'string' ? JSON.parse(orig.detalle) : (orig.detalle ?? {})
            const importeSueldos = num(detalle.premio?.importe_rrhh)
            const importeRecalculado = Number(rec.importe)

            const diferenciaTotal = importeSueldos === null ? null : redondear(importeRecalculado - importeSueldos)
            const confirmadoPrevio = redondear(
                previos.filter(r => r.resultado_id === orig.id)
                       .reduce((a, r) => a + Number(r.monto_pendiente ?? 0), 0)
            )
            const montoPendiente = diferenciaTotal === null ? null : redondear(diferenciaTotal - confirmadoPrevio)

            if (montoPendiente === 0) {
                omitidos.push({ resultado_id: orig.id, motivo: 'Ya confirmado, sin diferencia pendiente' }); continue
            }

            const { id } = await this.repo.crearRetro({
                cierre_id: cierreId,
                resultado_id: orig.id,
                cuil: orig.cuil,
                nombre_empleado: orig.nombre_empleado,
                porcentaje_original: Number(orig.porcentaje_calculado),
                dias_original: Number(orig.dias_presentismo),
                importe_sueldos: importeSueldos,
                porcentaje_recalculado: Number(rec.porcentaje),
                dias_recalculado: Number(rec.dias),
                importe_recalculado: importeRecalculado,
                diferencia_total: diferenciaTotal,
                monto_pendiente: montoPendiente,
                detalle_recalculado: item.detalle_recalculado ?? {},
                observacion: item.observacion ?? null,
                usuario: usuario ?? null
            })
            guardados.push({ id, resultado_id: orig.id, monto_pendiente: montoPendiente })
        }

        return { guardados, omitidos }
    }
}

module.exports = ConfirmarRetrosUseCase
