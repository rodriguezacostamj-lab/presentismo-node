const CalcularPresentismoUseCase = require('../../application/CalcularPresentismoUseCase')
const ReglaRepository = require('../../infrastructure/persistence/ReglaRepository')
const SQLiteConnection = require('../../infrastructure/persistence/SQLiteConnection')
const path = require('path')

class PresentismoController {

    async calcular(req, res) {
        try {
            const { desde_liq, hasta_liq, desde_pres, hasta_pres } = req.body

            // Validar períodos
            if (!desde_liq || !hasta_liq || !desde_pres || !hasta_pres) {
                return res.status(400).json({
                    error: 'Debe ingresar todos los períodos.'
                })
            }

            // Validar archivo de ausencias
            if (!req.files?.ausencias) {
                return res.status(400).json({
                    error: 'Debe subir el archivo de ausencias.'
                })
            }

            const archivoAusencias = req.files.ausencias
            const extension = path.extname(archivoAusencias.name).toLowerCase()

            if (extension !== '.csv') {
                return res.status(400).json({
                    error: 'El archivo de ausencias debe ser CSV. Descarga el reporte nuevamente como CSV y volvé a intentarlo.'
                })
            }

            // Ruta del archivo de sueldos (opcional)
            const rutaSueldos = req.files?.sueldos
                ? req.files.sueldos.tempFilePath
                : null

            // Conectar DB y ejecutar caso de uso
            const db   = new SQLiteConnection(path.resolve('data/presentismo.db'))
            const repo = new ReglaRepository(db)
            const useCase = new CalcularPresentismoUseCase(repo)

            const resultados = await useCase.ejecutar({
                rutaAusencias: archivoAusencias.tempFilePath,
                rutaSueldos,
                desdeLiq:  desde_liq,
                hastaLiq:  hasta_liq,
                desdePres: desde_pres,
                hastaPres: hasta_pres,
            })

            db.cerrar()

            return res.json({ resultados })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
}

module.exports = PresentismoController