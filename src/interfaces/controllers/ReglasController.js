const PostgresConnection = require('../../infrastructure/persistence/PostgresConnection')
const ReglaRepository = require('../../infrastructure/persistence/ReglaRepository')


class ReglasController {

    async obtenerParametros(req, res) {
        try {
            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            const valor = await repo.obtenerParametro('presentismo_base')
            db.cerrar()

            return res.json({ presentismo_base: valor })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    async actualizarParametro(req, res) {
        try {
            const { clave, valor } = req.body

            if (!clave || valor === undefined) {
                return res.status(400).json({ error: 'Debe enviar clave y valor.' })
            }

            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            await repo.actualizarParametro(clave, valor)
            db.cerrar()

            return res.json({ mensaje: 'Parámetro actualizado correctamente.' })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
    async obtenerReglas(req, res) {
        try {
            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            const reglas = await repo.obtenerTodas()
            db.cerrar()

            return res.json({ reglas })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    async actualizarRegla(req, res) {
        try {
            const { codigo } = req.params
            const campos = req.body

            if (!codigo || !campos) {
                return res.status(400).json({ error: 'Datos incompletos.' })
            }

            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            await repo.actualizarRegla(codigo, campos)
            db.cerrar()

            return res.json({ mensaje: 'Regla actualizada correctamente.' })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
    async crearRegla(req, res) {
        try {
            const campos = req.body

            if (!campos.codigo || !campos.nombre) {
                return res.status(400).json({ error: 'Código y nombre son obligatorios.' })
            }

            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            await repo.crearRegla(campos)
            db.cerrar()

            return res.status(201).json({ mensaje: 'Regla creada correctamente.' })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
    async eliminarRegla(req, res) {
        try {
            const { codigo } = req.params

            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            await repo.eliminarRegla(codigo)
            db.cerrar()

            return res.json({ mensaje: 'Regla eliminada correctamente.' })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
    async obtenerEspecial(req, res) {
        try {
            const { codigo } = req.params

            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            const especial = await repo.obtenerEspecial(codigo)
            db.cerrar()

            return res.json({ codigo, especial })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    async guardarEspecial(req, res) {
        try {
            const { codigo } = req.params
            const { bloques } = req.body

            if (!Array.isArray(bloques)) {
                return res.status(400).json({ error: 'bloques debe ser un array.' })
            }

            const db = new PostgresConnection()
            const repo = new ReglaRepository(db)

            await repo.guardarEspecial(codigo, bloques)
            db.cerrar()

            return res.json({ mensaje: 'Regla especial guardada correctamente.' })

        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }
}

module.exports = ReglasController