/**
 * migrate-postgres.js
 * Copia el esquema y los datos reales de una base Postgres a otra.
 * Sirve para migrar de proveedor (ej. si algún día hay que dejar Neon)
 * o como backup manual antes de un cambio grande.
 *
 * Uso:
 *   $env:SOURCE_DATABASE_URL = "postgresql://.../db-actual"
 *   $env:DEST_DATABASE_URL   = "postgresql://.../db-nueva"
 *   node scripts/migrate-postgres.js
 *
 * No borra nada en el origen. Es seguro correrlo varias veces:
 * usa ON CONFLICT DO NOTHING, así que no duplica filas ya migradas.
 */

const { Pool } = require('pg')

const SOURCE_URL = process.env.SOURCE_DATABASE_URL
const DEST_URL = process.env.DEST_DATABASE_URL

if (!SOURCE_URL || !DEST_URL) {
    console.error('❌ Faltan variables de entorno SOURCE_DATABASE_URL y/o DEST_DATABASE_URL')
    process.exit(1)
}

const source = new Pool({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } })
const dest = new Pool({ connectionString: DEST_URL, ssl: { rejectUnauthorized: false } })

const TABLAS = [
    {
        nombre: 'reglas_ausencias',
        createSql: `
            CREATE TABLE IF NOT EXISTS reglas_ausencias (
                id         SERIAL PRIMARY KEY,
                codigo     VARCHAR(20) UNIQUE NOT NULL,
                nombre     VARCHAR(100) NOT NULL,
                tope       INTEGER DEFAULT 0,
                descuenta  BOOLEAN DEFAULT true,
                corta      BOOLEAN DEFAULT false,
                activa     BOOLEAN DEFAULT true,
                regla      VARCHAR(50) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `,
        conflictCol: 'codigo'
    },
    {
        nombre: 'reglas_especiales',
        createSql: `
            CREATE TABLE IF NOT EXISTS reglas_especiales (
                id         SERIAL PRIMARY KEY,
                codigo     VARCHAR(20) UNIQUE NOT NULL,
                tipo       VARCHAR(50) DEFAULT 'CONDICIONES',
                parametros TEXT,
                activa     BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `,
        conflictCol: 'codigo'
    },
    {
        nombre: 'parametros',
        createSql: `
            CREATE TABLE IF NOT EXISTS parametros (
                clave VARCHAR(50) PRIMARY KEY,
                valor VARCHAR(100) NOT NULL
            )
        `,
        conflictCol: 'clave'
    },
    {
        nombre: 'usuarios',
        createSql: `
            CREATE TABLE IF NOT EXISTS usuarios (
                id       SERIAL PRIMARY KEY,
                usuario  VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                nombre   VARCHAR(100) NOT NULL,
                rol      VARCHAR(20) DEFAULT 'user',
                activo   BOOLEAN DEFAULT true
            )
        `,
        conflictCol: 'usuario'
    }
]

async function copiarTabla(tabla) {
    await dest.query(tabla.createSql)

    const { rows } = await source.query(`SELECT * FROM ${tabla.nombre}`)
    if (rows.length === 0) {
        console.log(`⏭️  ${tabla.nombre}: 0 filas en origen, nada que copiar`)
        return
    }

    const columnas = Object.keys(rows[0])
    const columnasSql = columnas.map(c => `"${c}"`).join(', ')

    for (const row of rows) {
        const valores = columnas.map(c => row[c])
        const placeholders = columnas.map((_, i) => `$${i + 1}`).join(', ')
        await dest.query(
            `INSERT INTO ${tabla.nombre} (${columnasSql}) VALUES (${placeholders})
             ON CONFLICT (${tabla.conflictCol}) DO NOTHING`,
            valores
        )
    }

    if (columnas.includes('id')) {
        await dest.query(`
            SELECT setval(
                pg_get_serial_sequence('${tabla.nombre}', 'id'),
                COALESCE((SELECT MAX(id) FROM ${tabla.nombre}), 1)
            )
        `)
    }

    const { rows: countDest } = await dest.query(`SELECT COUNT(*) FROM ${tabla.nombre}`)
    console.log(`✓ ${tabla.nombre}: ${rows.length} filas leídas de origen, ${countDest[0].count} filas ahora en destino`)
}

async function main() {
    console.log('Conectando a origen (Render) y destino (Neon)...\n')
    try {
        for (const tabla of TABLAS) {
            await copiarTabla(tabla)
        }
        console.log('\n✅ Migración de datos completa.')
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message)
        console.error('   code:', error.code, '| errno:', error.errno, '| syscall:', error.syscall, '| address:', error.address, '| port:', error.port)
        console.error(error.stack)
        process.exitCode = 1
    } finally {
        await source.end()
        await dest.end()
    }
}

main()
