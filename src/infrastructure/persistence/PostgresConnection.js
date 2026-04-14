/**
 * PostgresConnection.js
 * Reemplaza SQLiteConnection manteniendo exactamente la misma interfaz.
 * ReglaRepository y los controllers no necesitan ningún cambio.
 */

const { Pool } = require('pg')

class PostgresConnection {

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false
        })
    }

    // =============================================
    // REGLAS
    // =============================================

    async obtenerReglas() {
        const { rows } = await this.pool.query(`
            SELECT codigo, nombre, tope AS "diasTope", descuenta, corta, regla, activa
            FROM reglas_ausencias
            WHERE activa = true
        `)

        const resultado = []
        for (const r of rows) {
            resultado.push({
                ...r,
                parametrosEspeciales: await this.#obtenerParametrosEspeciales(r.codigo)
            })
        }
        return resultado
    }

    async #obtenerParametrosEspeciales(codigo) {
        const { rows } = await this.pool.query(`
            SELECT parametros
            FROM reglas_especiales
            WHERE codigo = $1 AND activa = true
        `, [codigo])

        if (rows.length === 0) return []
        try {
            return JSON.parse(rows[0].parametros)
        } catch {
            return []
        }
    }

    async actualizarRegla(codigo, campos) {
        const { nombre, tope, descuenta, corta, activa } = campos
        await this.pool.query(`
            UPDATE reglas_ausencias
            SET nombre = $1, tope = $2, descuenta = $3, corta = $4, activa = $5, updated_at = NOW()
            WHERE codigo = $6
        `, [nombre, tope, descuenta, corta, activa, codigo])
    }

    async crearRegla({ codigo, nombre, tope = 0, descuenta = false, corta = false, activa = true }) {
        await this.pool.query(`
            INSERT INTO reglas_ausencias (codigo, nombre, tope, descuenta, corta, activa)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [codigo, nombre, tope, descuenta, corta, activa])
    }

    async eliminarRegla(codigo) {
        await this.pool.query(`
            DELETE FROM reglas_ausencias WHERE codigo = $1
        `, [codigo])
    }

    async obtenerEspecial(codigo) {
        const { rows } = await this.pool.query(`
            SELECT parametros, tipo, activa
            FROM reglas_especiales
            WHERE codigo = $1
        `, [codigo])

        if (rows.length === 0) return null
        const row = rows[0]
        return {
            tipo:    row.tipo,
            activa:  row.activa,
            bloques: JSON.parse(row.parametros ?? '[]')
        }
    }

    async guardarEspecial(codigo, bloques) {
        const parametros = JSON.stringify(bloques)
        const { rows } = await this.pool.query(`
            SELECT codigo FROM reglas_especiales WHERE codigo = $1
        `, [codigo])

        if (rows.length > 0) {
            await this.pool.query(`
                UPDATE reglas_especiales SET parametros = $1, updated_at = NOW()
                WHERE codigo = $2
            `, [parametros, codigo])
        } else {
            await this.pool.query(`
                INSERT INTO reglas_especiales (codigo, tipo, parametros, activa)
                VALUES ($1, 'CONDICIONES', $2, true)
            `, [codigo, parametros])
        }
    }

    // =============================================
    // PARÁMETROS
    // =============================================

    async obtenerParametro(clave) {
        const { rows } = await this.pool.query(`
            SELECT valor FROM parametros WHERE clave = $1
        `, [clave])
        return rows[0]?.valor ?? null
    }

    async actualizarParametro(clave, valor) {
        await this.pool.query(`
            UPDATE parametros SET valor = $1 WHERE clave = $2
        `, [String(valor), clave])
    }

    // =============================================
    // USUARIOS
    // =============================================

    async obtenerUsuarioPorNombre(usuario) {
        const { rows } = await this.pool.query(`
            SELECT id, usuario, password, nombre, rol, activo
            FROM usuarios
            WHERE usuario = $1 AND activo = true
        `, [usuario])
        return rows[0] ?? null
    }

    // =============================================
    // CERRAR (no-op en Postgres, el pool se maneja solo)
    // =============================================

    cerrar() {
        // El pool de pg se mantiene abierto entre requests.
        // Solo se cierra al terminar el proceso.
    }
}

module.exports = PostgresConnection
