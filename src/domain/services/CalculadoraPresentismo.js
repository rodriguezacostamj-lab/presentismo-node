const Ausencia = require('../entities/Ausencia')
const Periodo = require('../entities/Periodo')

class CalculadoraPresentismo {

    constructor(catalogo) {
        this.catalogo = catalogo
    }

    analizar(empleado, periodoLiquidacion, periodoPresentismo) {

        const ausencias = empleado.obtenerAusencias()
        const historicas = []
        const delPeriodo = []

        const pPresDesde = periodoPresentismo.desde
        const pLiqDesde = periodoLiquidacion.desde

        // =============================
        // SEPARAR HISTÓRICAS Y DEL PERÍODO
        // =============================
        for (const a of ausencias) {
            if (!a.fechaDesde || !a.fechaHasta) continue

            // HISTÓRICO — desde inicio presentismo hasta día antes de liquidación
            const histHasta = new Date(pLiqDesde)
            histHasta.setDate(histHasta.getDate() - 1)

            if (a.fechaDesde <= histHasta && a.fechaHasta >= pPresDesde) {
                const inter = new Periodo(
                    pPresDesde.toISOString().split('T')[0],
                    histHasta.toISOString().split('T')[0]
                ).interseccion(a.fechaDesde, a.fechaHasta)

                if (inter) {
                    const [hDesde, hHasta] = inter
                    const dias = this.#diffDias(hDesde, hHasta)
                    historicas.push(new Ausencia({
                        ...a,
                        dias,
                        fechaDesde: hDesde,
                        fechaHasta: hHasta
                    }))
                }
            }

            // PERÍODO DE LIQUIDACIÓN
            const inter = periodoLiquidacion.interseccion(a.fechaDesde, a.fechaHasta)
            if (inter) {
                const [pDesde, pHasta] = inter
                const dias = this.#diffDias(pDesde, pHasta)
                delPeriodo.push(new Ausencia({
                    ...a,
                    dias,
                    fechaDesde: pDesde,
                    fechaHasta: pHasta
                }))
            }
        }

        // =============================
        // CORTE TOTAL
        // =============================
        for (const a of delPeriodo) {
            const tipo = this.catalogo.obtener(a.codigo)
            if (tipo?.corta) {
                return {
                    ausenciasPeriodo: delPeriodo,
                    ausenciasHistoricas: historicas,
                    detalle: [],
                    total_descontables: 0,
                    porcentaje: 0,
                    corte: true,
                    codigo_corte: a.codigo,
                    nombre_corte: tipo.nombre,
                }
            }
        }

        // =============================
        // HISTÓRICOS POR CLAVE
        // =============================
        const diasHistoricoPorClave = {}

        for (const a of historicas) {
            const tipo = this.catalogo.obtener(a.codigo)
            const clave = tipo ? tipo.resolverClave(a) : a.codigo

            const topeEfectivo = tipo ? tipo.getTopeParaAusencia(a) : 0
            if (tipo && topeEfectivo > 0) {
                diasHistoricoPorClave[clave] = (diasHistoricoPorClave[clave] ?? 0) + a.dias
            }
        }

        // =============================
        // PERÍODO POR CLAVE
        // =============================
        const diasPeriodoPorClave = {}
        const refPorClave = {}

        for (const a of delPeriodo) {
            const tipo = this.catalogo.obtener(a.codigo)
            const clave = tipo ? tipo.resolverClave(a) : a.codigo
            diasPeriodoPorClave[clave] = (diasPeriodoPorClave[clave] ?? 0) + a.dias

            if (!refPorClave[clave]) {
                refPorClave[clave] = a
            }
        }

        // =============================
        // DETALLE FINAL
        // =============================
        const detalle = []
        let totalDescontables = 0

        for (const [clave, diasPeriodo] of Object.entries(diasPeriodoPorClave)) {
            const ausenciaRef = refPorClave[clave]
            const tipo = this.catalogo.obtener(ausenciaRef.codigo)

            if (!tipo) continue

            const tope = tipo.getTopeParaAusencia(ausenciaRef)
            const usadoAntes = diasHistoricoPorClave[clave] ?? 0

            let descontablesCalculados

            if (tope <= 0) {
                descontablesCalculados = diasPeriodo
            } else if (usadoAntes >= tope) {
                descontablesCalculados = diasPeriodo
            } else {
                const restante = tope - usadoAntes
                descontablesCalculados = diasPeriodo <= restante ? 0 : diasPeriodo - restante
            }

            let descontables

            if (tipo.regla !== null) {
                descontables = descontablesCalculados
                totalDescontables += descontables
            } else if (!tipo.descuenta) {
                descontables = 0
            } else {
                descontables = descontablesCalculados
                totalDescontables += descontables
            }

            detalle.push({
                codigo: ausenciaRef.codigo,
                nombre: tipo.nombre,
                nivel: ausenciaRef.nivel ?? '-',
                dias: diasPeriodo,
                tope,
                historicos: usadoAntes,
                descontables,
            })
        }

        // =============================
        // PORCENTAJE
        // =============================
        let porcentaje
        if (totalDescontables === 0) porcentaje = 100
        else if (totalDescontables === 1) porcentaje = 70
        else if (totalDescontables === 2) porcentaje = 40
        else porcentaje = 0

        return {
            ausenciasPeriodo: delPeriodo,
            ausenciasHistoricas: historicas,
            detalle,
            total_descontables: totalDescontables,
            porcentaje,
        }
    }

    #diffDias(desde, hasta) {
        const ms = hasta.getTime() - desde.getTime()
        return Math.round(ms / (1000 * 60 * 60 * 24)) + 1
    }
}

module.exports = CalculadoraPresentismo