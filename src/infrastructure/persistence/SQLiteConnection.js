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
            activa:    r.activa === 1,
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
    actualizarRegla(codigo, campos) {
        const { nombre, tope, descuenta, corta, activa } = campos

        this.db.prepare(`
        UPDATE reglas_ausencias 
        SET nombre = ?, tope = ?, descuenta = ?, corta = ?, activa = ?
        WHERE codigo = ?
    `).run(nombre, tope, descuenta ? 1 : 0, corta ? 1 : 0, activa ? 1 : 0, codigo)
    }
}

module.exports = SQLiteConnection