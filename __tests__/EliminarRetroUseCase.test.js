const EliminarRetroUseCase = require('../src/application/EliminarRetroUseCase')

function armar(retros) {
    const eliminados = []
    const repo = {
        obtenerRetrosPorCierre: async () => retros,
        eliminarRetro: async id => { eliminados.push(id) }
    }
    return { uc: new EliminarRetroUseCase(repo), eliminados }
}

test('elimina el único retro de un agente', async () => {
    const { uc, eliminados } = armar([{ id: 1, resultado_id: 10 }])
    await uc.ejecutar({ cierreId: 5, retroId: 1 })
    expect(eliminados).toEqual([1])
})

test('elimina el último de varios retros del mismo agente', async () => {
    const { uc, eliminados } = armar([{ id: 1, resultado_id: 10 }, { id: 2, resultado_id: 10 }])
    await uc.ejecutar({ cierreId: 5, retroId: 2 })
    expect(eliminados).toEqual([2])
})

test('no permite eliminar uno anterior si hay un retro posterior del mismo agente (409)', async () => {
    const { uc, eliminados } = armar([{ id: 1, resultado_id: 10 }, { id: 2, resultado_id: 10 }])
    await expect(uc.ejecutar({ cierreId: 5, retroId: 1 })).rejects.toMatchObject({ status: 409 })
    expect(eliminados).toEqual([])
})

test('retros de otros agentes no bloquean', async () => {
    const { uc, eliminados } = armar([{ id: 1, resultado_id: 10 }, { id: 2, resultado_id: 11 }])
    await uc.ejecutar({ cierreId: 5, retroId: 1 })
    expect(eliminados).toEqual([1])
})

test('retro inexistente en el cierre devuelve 404', async () => {
    const { uc } = armar([{ id: 1, resultado_id: 10 }])
    await expect(uc.ejecutar({ cierreId: 5, retroId: 99 })).rejects.toMatchObject({ status: 404 })
})
