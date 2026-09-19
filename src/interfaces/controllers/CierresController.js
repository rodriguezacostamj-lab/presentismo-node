const CerrarPeriodoUseCase = require('../../application/CerrarPeriodoUseCase')
const CierreRepository = require('../../infrastructure/persistence/CierreRepository')
const PostgresConnection = require('../../infrastructure/persistence/PostgresConnection')

class CierresController {

    #repo() {
        const db = new PostgresConnection()
        return new CierreRepository(db)
    }

    async cerrar(req, res) {
        try {
            const { resultados, desde_pres, hasta_pres, desde_liq } = req.body

            if (!resultados || !Array.isArray(resultados) || resultados.length === 0) {
                return res.status(400).json({ error: 'No hay resultados para cerrar.' })
            }
            if (!desde_pres || !hasta_pres || !desde_liq) {
                return res.status(400).json({ error: 'Faltan datos de período.' })
            }

            const repo = this.#repo()
            const useCase = new CerrarPeriodoUseCase(repo)
            const resultado = await useCase.ejecutar({ resultados, desdePres: desde_pres, hastaPres: hasta_pres, desdeLiq: desde_liq })

            return res.json(resultado)
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Ya existe un cierre para este período de presentismo y liquidación.' })
            }
            return res.status(500).json({ error: error.message })
        }
    }

    async historial(req, res) {
        try {
            const { pres, periodo_liq, estado } = req.query
            const repo = this.#repo()
            const cierres = await repo.obtenerCierres({
                pres:       pres       || null,
                periodoLiq: periodo_liq || null,
                estado:     estado     || null
            })
            return res.json({ cierres })
        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    async eliminar(req, res) {
        try {
            const id = parseInt(req.params.id)
            const repo = this.#repo()
            const cierre = await repo.obtenerCierre(id)
            if (!cierre) return res.status(404).json({ error: 'Cierre no encontrado.' })
            await repo.eliminarCierre(id)
            return res.json({ ok: true })
        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    async detalle(req, res) {
        try {
            const id = parseInt(req.params.id)
            const repo = this.#repo()
            const cierre = await repo.obtenerCierre(id)
            if (!cierre) return res.status(404).json({ error: 'Cierre no encontrado.' })
            const resultados = await repo.obtenerResultadosCierre(id)
            return res.json({ cierre, resultados })
        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    async actualizarResultado(req, res) {
        try {
            const cierreId = parseInt(req.params.id)
            const resultadoId = parseInt(req.params.resultadoId)
            const campos = req.body

            const repo = this.#repo()

            // Verificar que el resultado pertenece al cierre antes de editar
            const resultados = await repo.obtenerResultadosCierre(cierreId)
            const existe = resultados.some(r => r.id === resultadoId)
            if (!existe) return res.status(404).json({ error: 'Resultado no encontrado en este cierre.' })

            await repo.marcarComoEditado(cierreId)
            await repo.actualizarResultado(resultadoId, campos)

            return res.json({ ok: true })
        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
}

module.exports = CierresController
