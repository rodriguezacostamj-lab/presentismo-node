const ExcelJS = require('exceljs')

// Período de pago = período de liquidación del cierre + 1 mes
// '2026-09' -> '10/2026' | '2026-12' -> '01/2027'
function periodoDePago(periodoLiquidacion) {
    const [anio, mes] = String(periodoLiquidacion).split('-').map(Number)
    const d = new Date(anio, mes, 1) // mes es 1-12, así que Date(anio, mes) ya es el mes siguiente
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Genera el Excel de retros: cuil | empleado | periodo | importe | %
 * filas: [{ cuil, nombre_empleado, periodo_liquidacion, monto_pendiente, porcentaje_recalculado }]
 * Devuelve un Buffer .xlsx
 */
class ExportadorRetros {

    async generar(filas) {
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet('Retros')

        ws.columns = [
            { header: 'cuil',     key: 'cuil',     width: 16 },
            { header: 'empleado', key: 'empleado', width: 42 },
            { header: 'periodo',  key: 'periodo',  width: 12 },
            { header: 'importe',  key: 'importe',  width: 14 },
            { header: '%',        key: 'porc',     width: 8 }
        ]

        for (const f of filas) {
            const cuil = /^\d+$/.test(String(f.cuil)) ? Number(f.cuil) : f.cuil
            ws.addRow({
                cuil,
                empleado: f.nombre_empleado,
                periodo: periodoDePago(f.periodo_liquidacion),
                importe: f.monto_pendiente === null || f.monto_pendiente === undefined ? null : Number(f.monto_pendiente),
                porc: Number(f.porcentaje_recalculado) / 100
            })
        }

        const header = ws.getRow(1)
        header.eachCell(c => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1738' } }
            c.alignment = { horizontal: 'center', vertical: 'middle' }
        })
        ws.getColumn('cuil').numFmt = '0'
        ws.getColumn('importe').numFmt = '0.00'
        ws.getColumn('porc').numFmt = '0%'
        ws.getColumn('periodo').alignment = { horizontal: 'center' }
        ws.getColumn('porc').alignment = { horizontal: 'center' }
        ws.autoFilter = { from: 'A1', to: 'E1' }
        ws.views = [{ state: 'frozen', ySplit: 1 }]

        return Buffer.from(await wb.xlsx.writeBuffer())
    }
}

module.exports = ExportadorRetros
