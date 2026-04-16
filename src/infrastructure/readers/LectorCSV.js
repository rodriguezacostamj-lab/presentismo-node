const { parse } = require('csv-parse')
const fs = require('fs')
const Empleado = require('../../domain/entities/Empleado')
const Ausencia = require('../../domain/entities/Ausencia')

class LectorCSV {

    async leerEmpleados(rutaArchivo) {
        const filas = await this.#parsearCSV(rutaArchivo)
        const empleadosPorCuil = {}

        for (const fila of filas) {

            // Ignorar filas de encabezado repetidas
            if (fila['CUIL'] === 'CUIL') continue

            const cuil = fila['CUIL']?.trim()
            const nombre = fila['NOMBRE']?.trim()
            const funcionEjecutiva = fila['FUNC. EJECUTIVA']?.trim()


            if (!cuil) continue

            // Crear empleado si no existe
            if (!empleadosPorCuil[cuil]) {
                empleadosPorCuil[cuil] = new Empleado({ cuil, nombre, funcionEjecutiva })
            }

            // Resolver código desde columna ART.
            const artRaw = fila['ART.']?.trim() ?? ''
            const codigo = this.#resolverCodigo(artRaw, fila['CAUSAL']?.trim())

            if (!codigo) continue

            // Parsear fechas
            const fechaDesde = this.#parsearFecha(fila['FECHA_DESDE'])
            const fechaHasta = this.#parsearFecha(fila['FECHA_HASTA'])

            const ausencia = new Ausencia({
                codigo,
                dias: 0, // se calcula en CalculadoraPresentismo
                fechaDesde,
                fechaHasta,
                nivel: fila['AUSENCIA']?.trim() ?? null,
                vinculo: fila['VINCULO']?.trim() ?? null,
                edad: fila['EDAD'] ? parseInt(fila['EDAD']) : null,
                discapacidad: fila['DISC'] === 'true' || fila['DISC'] === true,
                causal: fila['CAUSAL']?.trim() ?? null,
            })

            empleadosPorCuil[cuil].agregarAusencia(ausencia)
        }

        return Object.values(empleadosPorCuil)
    }

    #resolverCodigo(art, causal) {
        const artLower = art.toLowerCase()

        // Sin dato → usar causal para determinar código
        if (artLower === 's/d' || artLower === '' || !art) {
            if (!causal) return null
            const causalUpper = causal.toUpperCase()
            if (causalUpper.includes('INJUSTIFICADA')) return 'INJ'
            if (causalUpper.includes('HUELGA')) return 'HUE'
            if (causalUpper.includes('CARGO MAYOR')) return 'CMJ'  
            return null
        }

        // Formato normal: "3413 10A" → "10A"
        return art.split(' ').pop()
    }

    #parsearFecha(valor) {
    if (!valor || valor === 'null') return null

    const [fecha] = valor.split(' ')
    const [dia, mes, anio] = fecha.split('/')

    const anioCompleto = parseInt(anio) < 50 ? `20${anio}` : `19${anio}`

    
    return new Date(parseInt(anioCompleto), parseInt(mes) - 1, parseInt(dia))
    }

    #parsearCSV(rutaArchivo) {
        return new Promise((resolve, reject) => {
            const registros = []

            fs.createReadStream(rutaArchivo, { encoding: 'utf8' })
                .pipe(parse({
                    columns: true,
                    trim: true,
                    delimiter: ',',
                    quote: '"',
                    relax_quotes: true,
                    skip_records_with_error: true
                }))
                .on('data', fila => registros.push(fila))
                .on('end', () => resolve(registros))
                .on('error', err => reject(err))
                .on('skip', err => console.log('Fila saltada:', err.message))
        })
    }
}

module.exports = LectorCSV