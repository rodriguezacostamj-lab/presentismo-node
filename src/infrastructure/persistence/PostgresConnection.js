/**
 * PostgresConnection.js
 * Reemplaza SQLiteConnection manteniendo exactamente la misma interfaz.
 * ReglaRepository y los controllers no necesitan ningún cambio.
 */

const { Pool } = require('pg')

class PostgresConnection {

    constructor() {
        const connStr = process.env.DATABASE_URL || ''
        const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1')
        this.pool = new Pool({
            connectionString: connStr,
            ssl: isLocal ? false : { rejectUnauthorized: false }
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
    // CIERRES DE PERÍODO
    // =============================================

    async obtenerSnapshotReglas() {
        const reglas = await this.obtenerReglas()
        const { rows: especiales } = await this.pool.query(`
            SELECT codigo, tipo, parametros, activa FROM reglas_especiales
        `)
        const { rows: params } = await this.pool.query(`
            SELECT clave, valor FROM parametros
        `)
        const parametros = {}
        for (const p of params) parametros[p.clave] = p.valor
        return { reglas, especiales, parametros }
    }

    async crearCierre({ periodo_presentismo_desde, periodo_presentismo_hasta, periodo_liquidacion, valor_premio, reglas_aplicadas }) {
        const { rows } = await this.pool.query(`
            INSERT INTO cierres_periodo
                (periodo_presentismo_desde, periodo_presentismo_hasta, periodo_liquidacion, valor_premio, reglas_aplicadas)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, fecha_cierre
        `, [periodo_presentismo_desde, periodo_presentismo_hasta, periodo_liquidacion, valor_premio, JSON.stringify(reglas_aplicadas)])
        return rows[0]
    }

    async crearResultadosCalculo(cierreId, resultados) {
        for (const r of resultados) {
            await this.pool.query(`
                INSERT INTO resultados_calculo
                    (cierre_id, cuil, nombre_empleado, dias_presentismo, porcentaje_calculado, monto, detalle)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                cierreId,
                r.cuil,
                r.nombre_empleado,
                r.dias_presentismo,
                r.porcentaje_calculado,
                r.monto ?? null,
                JSON.stringify(r.detalle)
            ])
        }
    }

    async obtenerCierres({ pres, periodoLiq, estado } = {}) {
        const condiciones = []
        const valores = []
        let idx = 1

        if (pres) {
            condiciones.push(`periodo_presentismo_desde::text LIKE $${idx++}`)
            valores.push(pres + '%')
        }
        if (periodoLiq) {
            condiciones.push(`periodo_liquidacion = $${idx++}`)
            valores.push(periodoLiq)
        }
        if (estado) {
            condiciones.push(`estado = $${idx++}`)
            valores.push(estado)
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
        const { rows } = await this.pool.query(`
            SELECT id, periodo_presentismo_desde, periodo_presentismo_hasta,
                   periodo_liquidacion, fecha_cierre, estado,
                   fecha_ultima_edicion, valor_premio
            FROM cierres_periodo
            ${where}
            ORDER BY fecha_cierre DESC
        `, valores)
        return rows
    }

    async obtenerCierre(id) {
        const { rows } = await this.pool.query(`
            SELECT * FROM cierres_periodo WHERE id = $1
        `, [id])
        return rows[0] ?? null
    }

    async obtenerResultadosCierre(cierreId) {
        const { rows } = await this.pool.query(`
            SELECT id, cuil, nombre_empleado, dias_presentismo,
                   porcentaje_calculado, monto, detalle, observaciones, created_at
            FROM resultados_calculo
            WHERE cierre_id = $1
            ORDER BY nombre_empleado
        `, [cierreId])
        return rows
    }

    async buscarResultadosPorEmpleado({ nombre, periodoLiq, estado } = {}) {
        const condiciones = ['rc.nombre_empleado ILIKE $1']
        const valores = [`%${nombre}%`]
        let idx = 2

        if (periodoLiq) {
            condiciones.push(`cp.periodo_liquidacion = $${idx++}`)
            valores.push(periodoLiq)
        }
        if (estado) {
            condiciones.push(`cp.estado = $${idx++}`)
            valores.push(estado)
        }

        const { rows } = await this.pool.query(`
            SELECT
                rc.id, rc.cuil, rc.nombre_empleado,
                rc.dias_presentismo, rc.porcentaje_calculado,
                rc.monto, rc.detalle, rc.observaciones,
                cp.id              AS cierre_id,
                cp.periodo_presentismo_desde,
                cp.periodo_presentismo_hasta,
                cp.periodo_liquidacion,
                cp.fecha_cierre,
                cp.estado          AS cierre_estado
            FROM resultados_calculo rc
            JOIN cierres_periodo cp ON rc.cierre_id = cp.id
            WHERE ${condiciones.join(' AND ')}
            ORDER BY cp.fecha_cierre DESC
        `, valores)
        return rows
    }

    async eliminarCierre(id) {
        await this.pool.query(`DELETE FROM retros WHERE cierre_id = $1`, [id])
        await this.pool.query(`DELETE FROM resultados_calculo WHERE cierre_id = $1`, [id])
        await this.pool.query(`DELETE FROM cierres_periodo WHERE id = $1`, [id])
    }

    async marcarCierreComoEditado(cierreId) {
        await this.pool.query(`
            UPDATE cierres_periodo
            SET estado = 'editado', fecha_ultima_edicion = NOW()
            WHERE id = $1
        `, [cierreId])
    }

    async actualizarResultadoCalculo(id, campos) {
        const { observaciones, monto, porcentaje_calculado, dias_presentismo } = campos
        await this.pool.query(`
            UPDATE resultados_calculo
            SET observaciones        = COALESCE($1, observaciones),
                monto                = COALESCE($2, monto),
                porcentaje_calculado = COALESCE($3, porcentaje_calculado),
                dias_presentismo     = COALESCE($4, dias_presentismo)
            WHERE id = $5
        `, [observaciones ?? null, monto ?? null, porcentaje_calculado ?? null, dias_presentismo ?? null, id])
    }
    
        // =============================================
    // RETROS
    // =============================================

    async obtenerRetrosPorCierre(cierreId) {
        const { rows } = await this.pool.query(`
            SELECT * FROM retros WHERE cierre_id = $1 ORDER BY created_at
        `, [cierreId])
        return rows
    }

    async crearRetro(r) {
        const { rows } = await this.pool.query(`
            INSERT INTO retros
                (cierre_id, resultado_id, cuil, nombre_empleado,
                 porcentaje_original, dias_original, importe_sueldos,
                 porcentaje_recalculado, dias_recalculado, importe_recalculado,
                 diferencia_total, monto_pendiente, detalle_recalculado,
                 observacion, usuario)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
            RETURNING id
        `, [r.cierre_id, r.resultado_id, r.cuil, r.nombre_empleado,
            r.porcentaje_original, r.dias_original, r.importe_sueldos,
            r.porcentaje_recalculado, r.dias_recalculado, r.importe_recalculado,
            r.diferencia_total, r.monto_pendiente, JSON.stringify(r.detalle_recalculado),
            r.observacion ?? null, r.usuario ?? null])
        return rows[0]
    }
    
        async obtenerPeriodosConRetros() {
        const { rows } = await this.pool.query(`
            SELECT cp.periodo_liquidacion, COUNT(*)::int AS cantidad
            FROM retros r
            JOIN cierres_periodo cp ON cp.id = r.cierre_id
            GROUP BY cp.periodo_liquidacion
            ORDER BY cp.periodo_liquidacion DESC
        `)
        return rows
    }

    async obtenerRetrosParaExportar(periodos) {
        const { rows } = await this.pool.query(`
            SELECT r.cuil, r.nombre_empleado, r.porcentaje_recalculado,
                   r.monto_pendiente, cp.periodo_liquidacion
            FROM retros r
            JOIN cierres_periodo cp ON cp.id = r.cierre_id
            WHERE cp.periodo_liquidacion = ANY($1)
            ORDER BY cp.periodo_liquidacion, r.nombre_empleado
        `, [periodos])
        return rows
    }

        async eliminarRetro(id) {
        await this.pool.query(`DELETE FROM retros WHERE id = $1`, [id])
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
