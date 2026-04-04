const Database = require('better-sqlite3')
const path = require('path')

class SQLiteConnection {

    constructor(rutaDB) {
        this.db = new Database(rutaDB)
    }

    obtenerReglas() {
        const reglas = this.db.prepare(`
            SELECT codigo, nombre, tope AS diasTope, descuenta, corta, regla, activa
            FROM reglas_ausencias
            WHERE activa = 1
        `).all()

        return reglas.map(r => ({
            ...r,
            descuenta: r.descuenta === 1,
            corta: r.corta === 1,
            parametrosEspeciales: this.#obtenerParametrosEspeciales(r.codigo)
        }))
    }

    #obtenerParametrosEspeciales(codigo) {
        const especial = this.db.prepare(`
            SELECT parametros
            FROM reglas_especiales
            WHERE codigo = ? AND activa = 1
        `).get(codigo)

        if (!especial) return []

        try {
            return JSON.parse(especial.parametros)
        } catch {
            return []
        }
    }

    obtenerParametro(clave) {
        const row = this.db.prepare(`
            SELECT valor FROM parametros WHERE clave = ?
        `).get(clave)

        return row?.valor ?? null
    }
    actualizarParametro(clave, valor) {
        this.db.prepare(`
        UPDATE parametros SET valor = ? WHERE clave = ?
    `).run(String(valor), clave)
    }

    cerrar() {
        this.db.close()
    }
}

module.exports = SQLiteConnection