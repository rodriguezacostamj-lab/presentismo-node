const { parse } = require('csv-parse')
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

class LectorSueldos {

    async leerPremios(rutaArchivo) {
        const extension = path.extname(rutaArchivo).toLowerCase()

        if (extension === '.csv') {
            return this.#leerCSV(rutaArchivo)
        }

        if (extension === '.xlsx' || extension === '.xls') {
            return this.#leerExcel(rutaArchivo)
        }

        throw new Error(`Formato no soportado: ${extension}. Usá CSV o Excel.`)
    }

    #leerExcel(rutaArchivo) {
        const workbook = XLSX.readFile(rutaArchivo)

        // Buscar la hoja correcta por contenido
        const nombreHoja = this.#detectarHoja(workbook)
        if (!nombreHoja) {
            throw new Error('No se encontró una hoja con las columnas cuil, empleado e importe.')
        }

        const hoja = workbook.Sheets[nombreHoja]
        const filas = XLSX.utils.sheet_to_json(hoja)

        return this.#procesarFilas(filas)
    }

    #detectarHoja(workbook) {
    const hojasValidas = []

    for (const nombre of workbook.SheetNames) {
        const hoja = workbook.Sheets[nombre]
        const filas = XLSX.utils.sheet_to_json(hoja)
        if (filas.length > 0) {
            const columnas = Object.keys(filas[0]).map(c => c.toLowerCase())
            if (columnas.includes('cuil') && columnas.includes('importe')) {
                hojasValidas.push(nombre)
            }
        }
    }

    if (hojasValidas.length === 0) {
        throw new Error('No se encontró una hoja con las columnas cuil e importe.')
    }

    if (hojasValidas.length > 1) {
        throw new Error(
            `Se encontraron varias hojas válidas: ${hojasValidas.join(', ')}. ` +
            `Eliminá las que no corresponden y volvé a intentarlo.`
        )
    }

    return hojasValidas[0]
}

    async #leerCSV(rutaArchivo) {
        const filas = await this.#parsearCSV(rutaArchivo)
        return this.#procesarFilas(filas)
    }

    #procesarFilas(filas) {
        const sueldosPorCuil = {}

        for (const fila of filas) {
            // Buscar columnas sin importar mayúsculas
            const cuil     = this.#obtenerValor(fila, 'cuil')?.trim()
            const empleado = this.#obtenerValor(fila, 'empleado')?.trim()
            const importe  = this.#parsearImporte(this.#obtenerValor(fila, 'importe'))

            if (!cuil || isNaN(importe)) continue

            sueldosPorCuil[cuil] = { cuil, empleado, importe_rrhh: importe }
        }

        return sueldosPorCuil
    }

    // Busca la columna sin importar mayúsculas/minúsculas
    #obtenerValor(fila, columna) {
        const clave = Object.keys(fila).find(
            k => k.toLowerCase().trim() === columna.toLowerCase()
        )
        return clave ? String(fila[clave]) : null
    }

    #parsearImporte(valor) {
        if (!valor) return NaN
        // Reemplazar coma decimal por punto: "39903,5" → "39903.5"
        return parseFloat(valor.replace(',', '.'))
    }

    #parsearCSV(rutaArchivo) {
        return new Promise((resolve, reject) => {
            const registros = []

            fs.createReadStream(rutaArchivo)
                .pipe(parse({
                    columns:   true,
                    trim:      true,
                    delimiter: ';'
                }))
                .on('data',  fila => registros.push(fila))
                .on('end',   ()   => resolve(registros))
                .on('error', err  => reject(err))
        })
    }
}

module.exports = LectorSueldos