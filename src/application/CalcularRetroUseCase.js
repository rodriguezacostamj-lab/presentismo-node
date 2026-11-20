const CalcularPresentismoUseCase = require('./CalcularPresentismoUseCase')
const ReglasDeCierreAdapter = require('../infrastructure/persistence/ReglasDeCierreAdapter')

const redondear = n => Math.round(n * 100) / 100
const num = v => (v === null || v === undefined || v === '') ? null : Number(v)
const pad = n => String(n).padStart(2, '0')

// Los DATE de pg llegan como Date local; los pasamos a 'YYYY-MM-DD'
function aFechaISO(d) {
    if (d instanceof Date) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    return String(d).slice(0, 10)
}

// 'YYYY-MM' -> { desde: 'YYYY-MM-01', hasta: 'YYYY-MM-<último día>' }
function rangoLiquidacion(periodoLiquidacion) {
    const [anio, mes] = periodoLiquidacion.split('-').map(Number)
    const ultimo = new Date(anio, mes, 0).getDate()
    return { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-${pad(ultimo)}` }
}

/**
 * Recalcula un período cerrado con un CSV de ausencias actualizado,
 * usando las reglas y el valor_premio del cierre. NO modifica el cierre
 * ni guarda nada: solo devuelve las propuestas de retro.
 */
class CalcularRetroUseCase {

    constructor(repositorioCierres, { crearCalculador } = {}) {
        this.repo = repositorioCierres
        this.crearCalculador = crearCalculador
            ?? (reglasRepo => new CalcularPresentismoUseCase(reglasRepo))
    }

    async ejecutar({ cierreId, rutaAusencias }) {
        const cierre = await this.repo.obtenerCierre(cierreId)
        if (!cierre) throw new Error('Cierre no encontrado.')

        const originales = await this.repo.obtenerResultadosCierre(cierreId)
        const retrosPrevios = await this.repo.obtenerRetrosPorCierre(cierreId)

        const liq = rangoLiquidacion(cierre.periodo_liquidacion)
        const calculador = this.crearCalculador(new ReglasDeCierreAdapter({
            reglasAplicadas: cierre.reglas_aplicadas,
            valorPremio: cierre.valor_premio
        }))

        // Sin archivo de sueldos: la base de la diferencia es lo que ya
        // quedó guardado en el cierre (detalle.premio.importe_rrhh).
        const recalculados = await calculador.ejecutar({
            rutaAusencias,
            rutaSueldos: null,
            desdeLiq: liq.desde,
            hastaLiq: liq.hasta,
            desdePres: aFechaISO(cierre.periodo_presentismo_desde),
            hastaPres: aFechaISO(cierre.periodo_presentismo_hasta)
        })
        const recalcPorCuil = new Map(recalculados.map(r => [r.empleado.cuil, r]))

        const retros = []
        const noEncontrados = []
        let sinCambios = 0
        let excluidosFE = 0

        for (const orig of originales) {
            const nuevo = recalcPorCuil.get(orig.cuil)
            if (!nuevo) { noEncontrados.push(orig.cuil); continue }

            // Función Ejecutiva no cobra presentismo directo: se excluye
            if (nuevo.empleado.funcionEjecutiva) { excluidosFE++; continue }

            const detalle = typeof orig.detalle === 'string' ? JSON.parse(orig.detalle) : (orig.detalle ?? {})
            const porcOrig = Number(orig.porcentaje_calculado)
            const diasOrig = Number(orig.dias_presentismo)
            const porcNuevo = Number(nuevo.resultado.porcentaje ?? 0)
            const diasNuevo = Number(nuevo.resultado.total_descontables ?? 0)

            const cambio = Math.abs(porcNuevo - porcOrig) > 0.001 || diasNuevo !== diasOrig
            if (!cambio) { sinCambios++; continue }

            const importeSueldos = num(detalle.premio?.importe_rrhh)
            const importeRecalculado = nuevo.premio.importe_esperado
            const diferenciaTotal = importeSueldos === null
                ? null
                : redondear(importeRecalculado - importeSueldos)

            const confirmadoPrevio = redondear(
                retrosPrevios
                    .filter(r => r.resultado_id === orig.id)
                    .reduce((acc, r) => acc + Number(r.monto_pendiente ?? 0), 0)
            )
            const montoPendiente = diferenciaTotal === null
                ? null
                : redondear(diferenciaTotal - confirmadoPrevio)

            retros.push({
                resultado_id: orig.id,
                cuil: orig.cuil,
                nombre_empleado: orig.nombre_empleado,
                original: { porcentaje: porcOrig, dias: diasOrig },
                recalculado: { porcentaje: porcNuevo, dias: diasNuevo, importe: importeRecalculado },
                importe_sueldos: importeSueldos,
                sin_importe_sueldos: importeSueldos === null,
                diferencia_total: diferenciaTotal,
                confirmado_previo: confirmadoPrevio,
                monto_pendiente: montoPendiente,
                detalle_recalculado: {
                    resultado: nuevo.resultado,
                    premio: nuevo.premio,
                    alertas: nuevo.alertas
                }
            })
        }

        return {
            cierre: {
                id: cierre.id,
                periodo_liquidacion: cierre.periodo_liquidacion,
                valor_premio: Number(cierre.valor_premio)
            },
            retros,
            resumen: { con_retro: retros.length, sin_cambios: sinCambios, excluidos_fe: excluidosFE, no_encontrados: noEncontrados }
        }
    }
}

module.exports = CalcularRetroUseCase
