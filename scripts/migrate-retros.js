/**
 * migrate-retros.js
 * Crea la tabla de retroactivos confirmados sobre períodos cerrados.
 *
 * Uso:
 *   node scripts/migrate-retros.js
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
            CREATE TABLE IF NOT EXISTS retros (
                id                      SERIAL PRIMARY KEY,
                cierre_id               INTEGER NOT NULL REFERENCES cierres_periodo(id),
                resultado_id            INTEGER NOT NULL REFERENCES resultados_calculo(id),
                cuil                    VARCHAR(20) NOT NULL,
                nombre_empleado         VARCHAR(200) NOT NULL,

                -- Lo que se auditó y liquidó originalmente (snapshot)
                porcentaje_original     NUMERIC(5,2) NOT NULL,
                dias_original           INTEGER NOT NULL,

                -- Lo que pagó sueldos (base de toda diferencia). NULL si no figuraba en sueldos.
                importe_sueldos         NUMERIC(12,2),

                -- Lo que corresponde según el recálculo con el valor_premio del cierre
                porcentaje_recalculado  NUMERIC(5,2) NOT NULL,
                dias_recalculado        INTEGER NOT NULL,
                importe_recalculado     NUMERIC(12,2) NOT NULL,

                -- recalculado - sueldos, acumulado contra el cierre original
                diferencia_total        NUMERIC(12,2),
                -- lo que se reclama en ESTE retro: diferencia_total menos retros ya confirmados
                monto_pendiente         NUMERIC(12,2),

                detalle_recalculado     JSONB NOT NULL,
                observacion             TEXT,
                usuario                 VARCHAR(100),
                created_at              TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `)
        console.log('✓ Tabla retros creada')

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_retros_cierre_cuil
                ON retros(cierre_id, cuil)
        `)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_retros_cuil
                ON retros(cuil)
        `)
        console.log('✓ Índices creados')

        console.log('\n✅ Migración de retros completa.')

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message)
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

migrar()