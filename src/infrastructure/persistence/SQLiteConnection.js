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
            activa: r.activa === 1,
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
    crearRegla({ codigo, nombre, tope = 0, descuenta = false, corta = false, activa = true }) {
        this.db.prepare(`
        INSERT INTO reglas_ausencias (codigo, nombre, tope, descuenta, corta, activa)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(codigo, nombre, tope, descuenta ? 1 : 0, corta ? 1 : 0, activa ? 1 : 0)
    }
    eliminarRegla(codigo) {
        this.db.prepare(`
        DELETE FROM reglas_ausencias WHERE codigo = ?
    `).run(codigo)
    }
    obtenerEspecial(codigo) {
        const row = this.db.prepare(`
        SELECT parametros, tipo, activa
        FROM reglas_especiales
        WHERE codigo = ?
    `).get(codigo)

        if (!row) return null

        return {
            tipo: row.tipo,
            activa: row.activa === 1,
            bloques: JSON.parse(row.parametros ?? '[]')
        }
    }

    guardarEspecial(codigo, bloques) {
        const existe = this.db.prepare(`
        SELECT codigo FROM reglas_especiales WHERE codigo = ?
    `).get(codigo)

        const parametros = JSON.stringify(bloques)

        if (existe) {
            this.db.prepare(`
            UPDATE reglas_especiales SET parametros = ? WHERE codigo = ?
        `).run(parametros, codigo)
        } else {
            this.db.prepare(`
            INSERT INTO reglas_especiales (codigo, tipo, parametros, activa)
            VALUES (?, 'CONDICIONES', ?, 1)
        `).run(codigo, parametros)
        }
    }
}

module.exports = SQLiteConnection