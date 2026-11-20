const ExcelJS = require('exceljs')
const ExportadorRetros = require('../src/infrastructure/exporters/ExportadorRetros')

async function leer(buffer) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    return wb.worksheets[0]
}

test('genera encabezados y fila con el formato esperado', async () => {
    const buf = await new ExportadorRetros().generar([{
        cuil: '20176812533', nombre_empleado: 'BELEN, MARIO OMAR',
        periodo_liquidacion: '2026-09', monto_pendiente: '-40993.20', porcentaje_recalculado: '40.00'
    }])
    const ws = await leer(buf)
    expect(ws.getRow(1).values.slice(1)).toEqual(['cuil', 'empleado', 'periodo', 'importe', '%'])
    const r = ws.getRow(2).values.slice(1)
    expect(r[0]).toBe(20176812533)
    expect(r[1]).toBe('BELEN, MARIO OMAR')
    expect(r[2]).toBe('10/2026') // liquidación 2026-09 -> se paga en 10/2026
    expect(r[3]).toBe(-40993.2)
    expect(r[4]).toBeCloseTo(0.4)
    expect(ws.getCell('E2').numFmt).toBe('0%')
})

test('diciembre pasa al año siguiente', async () => {
    const buf = await new ExportadorRetros().generar([{
        cuil: '1', nombre_empleado: 'X', periodo_liquidacion: '2026-12', monto_pendiente: '-1', porcentaje_recalculado: 40
    }])
    expect((await leer(buf)).getCell('C2').value).toBe('01/2027')
})

test('importe null queda vacío', async () => {
    const buf = await new ExportadorRetros().generar([{
        cuil: '1', nombre_empleado: 'X', periodo_liquidacion: '2026-10', monto_pendiente: null, porcentaje_recalculado: 0
    }])
    const ws = await leer(buf)
    expect(ws.getCell('D2').value).toBeNull()
})

test('sin filas devuelve solo encabezados', async () => {
    const ws = await leer(await new ExportadorRetros().generar([]))
    expect(ws.rowCount).toBe(1)
})
