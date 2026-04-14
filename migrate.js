/**
 * migrate.js
 * Crea las tablas en Postgres e inserta todos los datos de SQLite.
 * 
 * Uso:
 *   node migrate.js
 * 
 * Requiere la variable de entorno DATABASE_URL con la External Database URL de Render.
 */

const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
})

async function migrar() {
    const client = await pool.connect()

    try {
        console.log('Conectando a Postgres...')

        // =============================================
        // CREAR TABLAS
        // =============================================

        await client.query(`
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
        `)
        console.log('✓ Tabla reglas_ausencias creada')

        await client.query(`
            CREATE TABLE IF NOT EXISTS reglas_especiales (
                id         SERIAL PRIMARY KEY,
                codigo     VARCHAR(20) UNIQUE NOT NULL,
                tipo       VARCHAR(50) DEFAULT 'CONDICIONES',
                parametros TEXT,
                activa     BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `)
        console.log('✓ Tabla reglas_especiales creada')

        await client.query(`
            CREATE TABLE IF NOT EXISTS parametros (
                clave VARCHAR(50) PRIMARY KEY,
                valor VARCHAR(100) NOT NULL
            )
        `)
        console.log('✓ Tabla parametros creada')

        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id       SERIAL PRIMARY KEY,
                usuario  VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                nombre   VARCHAR(100) NOT NULL,
                rol      VARCHAR(20) DEFAULT 'user',
                activo   BOOLEAN DEFAULT true
            )
        `)
        console.log('✓ Tabla usuarios creada')

        // =============================================
        // INSERTAR reglas_ausencias
        // =============================================

        const reglas = [
            { codigo: '10A',     nombre: 'ENFERMEDAD DE CORTO TRATAMIENTO', tope: 4,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '10J',     nombre: 'ENFERMEDAD FAMILIAR',              tope: 0,  descuenta: true,  corta: false, activa: true,  regla: 'por_grupo_familiar' },
            { codigo: '14H',     nombre: 'OTRAS INASISTENCIAS 0%',           tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '14F',     nombre: 'AUSENTE CON AVISO',                tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '10C',     nombre: 'ENFERMEDAD LARGO TRATAMIENTO',     tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '10D',     nombre: 'ACCIDENTE DE TRABAJO',             tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '10G',     nombre: 'MATERNIDAD',                       tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '10I',     nombre: 'ATENCION HIJOS MENORES',           tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '13D',     nombre: 'MATRIMONIO',                       tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '146B1',   nombre: 'LIC. GREMIAL B1',                  tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '146B2',   nombre: 'LIC. GREMIAL B2',                  tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '146B3',   nombre: 'LIC. GREMIAL B3',                  tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '138C',    nombre: 'EXCEDENCIA',                       tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '14G',     nombre: 'MESA EXAMINADORA',                 tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '14C',     nombre: 'FUERZA MAYOR',                     tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '1207/13', nombre: 'RESOLUCION ANSES',                 tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
            { codigo: '9',       nombre: 'LICENCIA ORDINARIA',               tope: 0,  descuenta: false, corta: false, activa: true,  regla: null },
            { codigo: '13A',     nombre: 'LICENCIA POR EXAMEN',              tope: 0,  descuenta: false, corta: false, activa: true,  regla: 'por_nivel' },
            { codigo: 'S/D',     nombre: 'AUSENCIA INJUSTIF SIN SUELDO',     tope: 0,  descuenta: true,  corta: true,  activa: true,  regla: null },
            { codigo: '14B',     nombre: 'FALLECIMIENTO FAMILIAR',           tope: 0,  descuenta: false, corta: false, activa: true,  regla: null },
            { codigo: '14D',     nombre: 'DONACION DE SANGRE',               tope: 0,  descuenta: false, corta: false, activa: true,  regla: null },
            { codigo: 'CMJ',     nombre: 'CARGO DE MAYOR JERARQUIA',         tope: 0,  descuenta: false, corta: false, activa: true,  regla: null },
            { codigo: 'HUE',     nombre: 'ADHESION A PARO O HUELGA',         tope: 0,  descuenta: true,  corta: false, activa: true,  regla: null },
        ]

        for (const r of reglas) {
            await client.query(`
                INSERT INTO reglas_ausencias (codigo, nombre, tope, descuenta, corta, activa, regla)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (codigo) DO NOTHING
            `, [r.codigo, r.nombre, r.tope, r.descuenta, r.corta, r.activa, r.regla])
        }
        console.log(`✓ ${reglas.length} reglas de ausencias insertadas`)

        // =============================================
        // INSERTAR reglas_especiales
        // =============================================

        const especiales = [
            {
                codigo: '13A',
                tipo: 'CONDICIONES',
                parametros: JSON.stringify([
                    { prioridad: 1, tope: 2, descripcion: 'Examen nivel secundario',  condiciones: [{ campo: 'nivel', operador: '=', valor: 'SECUNDARIO'   }] },
                    { prioridad: 2, tope: 2, descripcion: 'Examen postgrado',          condiciones: [{ campo: 'nivel', operador: '=', valor: 'POSTGRADO'    }] },
                    { prioridad: 3, tope: 3, descripcion: 'Examen terciario',          condiciones: [{ campo: 'nivel', operador: '=', valor: 'TERCIARIO'    }] },
                    { prioridad: 4, tope: 4, descripcion: 'Examen universitario',      condiciones: [{ campo: 'nivel', operador: '=', valor: 'UNIVERSITARIO'}] },
                ])
            },
            {
                codigo: '10J',
                tipo: 'CONDICIONES',
                parametros: JSON.stringify([
                    { prioridad: 1, tope: 3, descripcion: 'Familiar con discapacidad',   condiciones: [{ campo: 'discapacidad', operador: '=',        valor: true      }] },
                    { prioridad: 2, tope: 3, descripcion: 'Adulto mayor de 65 años',     condiciones: [{ campo: 'edad',         operador: '>=',       valor: 65        }] },
                    { prioridad: 3, tope: 3, descripcion: 'Menor de 18 años a cargo',    condiciones: [{ campo: 'edad',         operador: '<=',       valor: 18        }] },
                    { prioridad: 4, tope: 3, descripcion: 'Cónyuge',                     condiciones: [{ campo: 'vinculo',      operador: 'CONTIENE', valor: 'CONYUGE' }] },
                ])
            }
        ]

        for (const e of especiales) {
            await client.query(`
                INSERT INTO reglas_especiales (codigo, tipo, parametros)
                VALUES ($1, $2, $3)
                ON CONFLICT (codigo) DO NOTHING
            `, [e.codigo, e.tipo, e.parametros])
        }
        console.log('✓ Reglas especiales insertadas (13A, 10J)')

        // =============================================
        // INSERTAR parametros
        // =============================================

        await client.query(`
            INSERT INTO parametros (clave, valor)
            VALUES ('presentismo_base', '59715')
            ON CONFLICT (clave) DO NOTHING
        `)
        console.log('✓ Parámetros insertados (presentismo_base: 59715)')

        // =============================================
        // INSERTAR usuarios
        // IMPORTANTE: reemplazá el hash por el real de tu DB
        // =============================================

        console.log('\n⚠️  El usuario admin necesita su password hash.')
        console.log('   Corré este comando para obtenerlo:')
        console.log('   node -e "const D=require(\'better-sqlite3\');const db=new D(\'data/presentismo.db\');console.log(db.prepare(\'SELECT password FROM usuarios WHERE usuario=\\\'admin\\\'\').get())"')
        console.log('   Luego pegalo en la variable ADMIN_HASH de este script y volvé a correr.\n')

        const ADMIN_HASH = process.env.ADMIN_HASH || null

        if (ADMIN_HASH) {
            await client.query(`
                INSERT INTO usuarios (usuario, password, nombre, rol, activo)
                VALUES ('admin', $1, 'Administrador', 'admin', true)
                ON CONFLICT (usuario) DO NOTHING
            `, [ADMIN_HASH])
            console.log('✓ Usuario admin insertado')
        } else {
            console.log('⏭️  Usuario admin omitido (falta ADMIN_HASH)')
        }

        console.log('\n✅ Migración completa.')

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message)
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

migrar()
