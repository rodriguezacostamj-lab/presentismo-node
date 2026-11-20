const ConfirmarRetrosUseCase = require('../src/application/ConfirmarRetrosUseCase')

const orig = { id: 10, cuil: '20-1', nombre_empleado: 'Juan', dias_presentismo: 0,
    porcentaje_calculado: '100.00', detalle: { premio: { importe_rrhh: 59715 } } }

function armar(previos = []) {
    const creados = []
    const repo = {
        obtenerCierre: async () => ({ id: 1 }),
        obtenerResultadosCierre: async () => [orig],
        obtenerRetrosPorCierre: async () => previos,
        crearRetro: async r => { creados.push(r); return { id: creados.length } }
    }
    return { uc: new ConfirmarRetrosUseCase(repo), creados }
}
const item = (extra = {}) => ({
    resultado_id: 10, observacion: 'ausencia cargada tarde',
    recalculado: { porcentaje: 70, dias: 1, importe: 41800.5 },
    detalle_recalculado: { x: 1 }, ...extra
})

test('guarda el retro con diferencia calculada en el servidor', async () => {
    const { uc, creados } = armar()
    const r = await uc.ejecutar({ cierreId: 1, items: [item()], usuario: 'marce' })
    expect(r.guardados).toHaveLength(1)
    expect(creados[0]).toMatchObject({
        porcentaje_original: 100, importe_sueldos: 59715,
        diferencia_total: -17914.5, monto_pendiente: -17914.5, usuario: 'marce'
    })
})

test('confirmar dos veces lo mismo no duplica', async () => {
    const { uc } = armar([{ resultado_id: 10, monto_pendiente: '-17914.50' }])
    const r = await uc.ejecutar({ cierreId: 1, items: [item()], usuario: 'marce' })
    expect(r.guardados).toHaveLength(0)
    expect(r.omitidos[0].motivo).toMatch(/Ya confirmado/)
})

test('resultado ajeno al cierre se omite', async () => {
    const { uc } = armar()
    const r = await uc.ejecutar({ cierreId: 1, items: [item({ resultado_id: 999 })] })
    expect(r.omitidos[0].motivo).toMatch(/No pertenece/)
})
