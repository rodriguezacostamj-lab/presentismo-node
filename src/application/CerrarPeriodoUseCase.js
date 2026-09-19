class CerrarPeriodoUseCase {

    constructor(repositorioCierres) {
        this.repositorioCierres = repositorioCierres
    }

    async ejecutar({ resultados, desdePres, hastaPres, desdeLiq }) {
        // 1. Snapshot de reglas vigentes al momento del cierre
        const reglas_aplicadas = await this.repositorioCierres.obtenerSnapshotReglas()

        // 2. valor_premio = presentismo_base vigente
        const valor_premio = parseFloat(reglas_aplicadas.parametros.presentismo_base ?? 0)

        // 3. periodo_liquidacion derivado del mes/año del "desde" de liquidación (ej. '2026-02')
        const periodo_liquidacion = desdeLiq.slice(0, 7)

        // 4. Crear cabecera
        const cierre = await this.repositorioCierres.cerrarPeriodo({
            periodo_presentismo_desde: desdePres,
            periodo_presentismo_hasta: hastaPres,
            periodo_liquidacion,
            valor_premio,
            reglas_aplicadas
        })

        // 5. Mapear resultados del frontend al formato de resultados_calculo
        const filas = resultados.map(r => ({
            cuil:                 r.empleado.cuil,
            nombre_empleado:      r.empleado.nombre,
            dias_presentismo:     r.resultado.total_descontables,
            porcentaje_calculado: r.resultado.porcentaje,
            monto:                r.premio?.importe_esperado ?? null,
            detalle: {
                resultado: r.resultado,
                premio:    r.premio,
                alertas:   r.alertas
            }
        }))

        // 6. Persistir detalle por empleado
        await this.repositorioCierres.guardarResultados(cierre.id, filas)

        return { cierreId: cierre.id, fecha_cierre: cierre.fecha_cierre }
    }
}

module.exports = CerrarPeriodoUseCase
