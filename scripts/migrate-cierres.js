/**
 * migrate-cierres.js
 * Crea las tablas de historial de cierres de período de presentismo.
 *
 * Uso:
 *   node scripts/migrate-cierres.js
 *
 * Requiere la variable de entorno DATABASE_URL.
 */

const { Pool } = require('pg')

const connStr = process.env.DATABASE_URL || ''
const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1')
const pool = new Pool({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false }
})

async function migrar() {
    const client = await pool.connect()

    try {
        console.log('Conectando a Postgres...')

        await client.query(`
            CREATE TABLE IF NOT EXISTS cierres_periodo (
                id                          SERIAL PRIMARY KEY,
                periodo_presentismo_desde   DATE NOT NULL,
                periodo_presentismo_hasta   DATE NOT NULL,
                periodo_liquidacion         VARCHAR(7) NOT NULL,
                fecha_cierre                TIMESTAMP NOT NULL DEFAULT NOW(),
                estado                      VARCHAR(20) NOT NULL DEFAULT 'exportado'
                                            CHECK (estado IN ('exportado', 'editado')),
                fecha_ultima_edicion        TIMESTAMP,
                valor_premio                NUMERIC(12,2) NOT NULL,
                reglas_aplicadas            JSONB NOT NULL,
                UNIQUE (periodo_presentismo_desde, periodo_presentismo_hasta, periodo_liquidacion)
            )
        `)
        console.log('✓ Tabla cierres_periodo creada')

        await client.query(`
            CREATE TABLE IF NOT EXISTS resultados_calculo (
                id                      SERIAL PRIMARY KEY,
                cierre_id               INTEGER NOT NULL REFERENCES cierres_periodo(id),
                cuil                    VARCHAR(20) NOT NULL,
                nombre_empleado         VARCHAR(200) NOT NULL,
                dias_presentismo        INTEGER NOT NULL,
                porcentaje_calculado    NUMERIC(5,2) NOT NULL,
                monto                   NUMERIC(12,2),
                detalle                 JSONB NOT NULL,
                observaciones           TEXT,
                created_at              TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `)
        console.log('✓ Tabla resultados_calculo creada')

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resultados_cierre
                ON resultados_calculo(cierre_id)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resultados_cuil
                ON resultados_calculo(cuil)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_resultados_nombre_empleado
                ON resultados_calculo(nombre_empleado)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cierres_periodo_presentismo
                ON cierres_periodo(periodo_presentismo_desde, periodo_presentismo_hasta)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cierres_periodo_liquidacion
                ON cierres_periodo(periodo_liquidacion)
        `)
        console.log('✓ Índices creados')

        console.log('\n✅ Migración de cierres completa.')

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message)
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

migrar()
