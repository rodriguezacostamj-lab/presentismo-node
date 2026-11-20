const CalcularRetroUseCase = require('../src/application/CalcularRetroUseCase')
const ReglasDeCierreAdapter = require('../src/infrastructure/persistence/ReglasDeCierreAdapter')

const cierre = {
    id: 1,
    periodo_liquidacion: '2026-10',
    valor_premio: '59715.00',
    periodo_presentismo_desde: new Date(2026, 8, 1),
    periodo_presentismo_hasta: new Date(2026, 8, 30),
    reglas_aplicadas: { reglas: [{ codigo: 'S/D' }], parametros: { presentismo_base: '1' } }
}

const orig = (id, cuil, porc, dias, rrhh) => ({
    id, cuil, nombre_empleado: 'Emp ' + cuil,
    dias_presentismo: dias, porcentaje_calculado: String(porc),
    detalle: { premio: { importe_rrhh: rrhh } }
})

const nuevo = (cuil, porcentaje, dias, importe, fe = false) => ({
    empleado: { cuil, funcionEjecutiva: fe },
    resultado: { porcentaje, total_descontables: dias },
    premio: { importe_esperado: importe },
    alertas: {}
})

function armar({ originales, recalculados, retrosPrevios = [] }) {
    const repo = {
        obtenerCierre: async () => cierre,
        obtenerResultadosCierre: async () => originales,
        obtenerRetrosPorCierre: async () => retrosPrevios
    }
    let args
    const uc = new CalcularRetroUseCase(repo, {
        crearCalculador: reglasRepo => ({
            reglasRepo,
            ejecutar: async a => { args = a; return recalculados }
        })
    })
    return { uc, getArgs: () => args }
}

test('usa períodos y valor del cierre al recalcular', async () => {
    const { uc, getArgs } = armar({ originales: [], recalculados: [] })
    await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(getArgs()).toMatchObject({
        desdeLiq: '2026-10-01', hastaLiq: '2026-10-31',
        desdePres: '2026-09-01', hastaPres: '2026-09-30', rutaSueldos: null
    })
})

test('Juan: 100% -> 70% con sueldos pagando 59715 => diferencia -17914.50', async () => {
    const { uc } = armar({
        originales: [orig(10, '20-1', 100, 0, 59715)],
        recalculados: [nuevo('20-1', 70, 1, 41800.5)]
    })
    const r = await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(r.retros).toHaveLength(1)
    expect(r.retros[0].diferencia_total).toBe(-17914.5)
    expect(r.retros[0].monto_pendiente).toBe(-17914.5)
})

test('sin cambios de porcentaje ni días no genera retro', async () => {
    const { uc } = armar({
        originales: [orig(10, '20-1', 70, 1, 41800.5)],
        recalculados: [nuevo('20-1', 70, 1, 41800.5)]
    })
    const r = await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(r.retros).toHaveLength(0)
    expect(r.resumen.sin_cambios).toBe(1)
})

test('FE se excluye', async () => {
    const { uc } = armar({
        originales: [orig(10, '20-1', 100, 0, null)],
        recalculados: [nuevo('20-1', 0, 3, 0, true)]
    })
    const r = await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(r.retros).toHaveLength(0)
    expect(r.resumen.excluidos_fe).toBe(1)
})

test('sin importe de sueldos => diferencia null y marca sin_importe_sueldos', async () => {
    const { uc } = armar({
        originales: [orig(10, '20-1', 100, 0, null)],
        recalculados: [nuevo('20-1', 40, 2, 23886)]
    })
    const r = await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(r.retros[0].sin_importe_sueldos).toBe(true)
    expect(r.retros[0].diferencia_total).toBeNull()
    expect(r.retros[0].monto_pendiente).toBeNull()
})

test('retros previos confirmados se descuentan del pendiente', async () => {
    const { uc } = armar({
        originales: [orig(10, '20-1', 100, 0, 59715)],
        recalculados: [nuevo('20-1', 40, 2, 23886)],
        retrosPrevios: [{ resultado_id: 10, monto_pendiente: '-17914.50' }]
    })
    const r = await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(r.retros[0].diferencia_total).toBe(-35829)
    expect(r.retros[0].confirmado_previo).toBe(-17914.5)
    expect(r.retros[0].monto_pendiente).toBe(-17914.5)
})

test('empleado del cierre ausente en el CSV nuevo se informa', async () => {
    const { uc } = armar({ originales: [orig(10, '20-9', 100, 0, 1)], recalculados: [] })
    const r = await uc.ejecutar({ cierreId: 1, rutaAusencias: 'a.csv' })
    expect(r.resumen.no_encontrados).toEqual(['20-9'])
})

test('adapter: valor_premio del cierre pisa el parámetro y sirve reglas', async () => {
    const a = new ReglasDeCierreAdapter({ reglasAplicadas: JSON.stringify(cierre.reglas_aplicadas), valorPremio: '59715.00' })
    expect(await a.obtenerParametro('presentismo_base')).toBe('59715.00')
    expect(await a.obtenerTodas()).toEqual([{ codigo: 'S/D' }])
})
