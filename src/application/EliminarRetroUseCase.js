/**
 * Elimina un retro confirmado. Solo se permite borrar el ÚLTIMO retro de
 * cada agente en el cierre, porque el monto de los retros siguientes se
 * calculó descontando los anteriores.
 */
class EliminarRetroUseCase {

    constructor(repositorioCierres) {
        this.repo = repositorioCierres
    }

    async ejecutar({ cierreId, retroId }) {
        const retros = await this.repo.obtenerRetrosPorCierre(cierreId)
        const retro = retros.find(r => r.id === retroId)
        if (!retro) throw this.#error('Retro no encontrado en este cierre.', 404)

        const hayPosterior = retros.some(r => r.resultado_id === retro.resultado_id && r.id > retro.id)
        if (hayPosterior) {
            throw this.#error('Este agente tiene un retro posterior. Eliminá primero el más reciente.', 409)
        }

        await this.repo.eliminarRetro(retroId)
        return { ok: true }
    }

    #error(mensaje, status) {
        const e = new Error(mensaje)
        e.status = status
        return e
    }
}

module.exports = EliminarRetroUseCase
