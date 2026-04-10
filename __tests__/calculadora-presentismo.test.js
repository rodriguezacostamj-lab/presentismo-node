/**
 * Tests unitarios: CalculadoraPresentismo.analizar()
 * Basado en el código real de src/domain/services/CalculadoraPresentismo.js
 *
 * Cubre:
 *   - Porcentajes: 0 ausencias → 100%, 1 → 70%, 2 → 40%, 3+ → 0%
 *   - Ausencia con corte total
 *   - Ausencia que NO descuenta (dentro del tope)
 *   - Acumulación histórica que consume el tope
 */

const CalculadoraPresentismo  = require('../src/domain/services/CalculadoraPresentismo')
const CatalogoTipoDeAusencia  = require('../src/domain/services/CatalogoTipoDeAusencia')
const TipoAusencia            = require('../src/domain/entities/TipoAusencia')
const Periodo                 = require('../src/domain/entities/Periodo')
const Ausencia                = require('../src/domain/entities/Ausencia')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockEmpleado(ausencias = []) {
  return { obtenerAusencias: () => ausencias }
}

function ausenciaMes(codigo, anio, mes, diaDesde, diaHasta, extras = {}) {
  return new Ausencia({
    codigo,
    dias: diaHasta - diaDesde + 1,
    fechaDesde: new Date(anio, mes - 1, diaDesde).toISOString().split('T')[0],
    fechaHasta: new Date(anio, mes - 1, diaHasta).toISOString().split('T')[0],
    ...extras,
  })
}

function tipoEstandar(codigo, nombre = 'Test') {
  return new TipoAusencia({ codigo, nombre, diasTope: 0, descuenta: true })
}

const OCTUBRE     = Periodo.mes(2024, 10)
const PRESENTISMO = Periodo.mes(2024,  1)  // desde enero — cubre todo el histórico

// ===========================================================================
// 1. PORCENTAJES
// ===========================================================================

describe('CalculadoraPresentismo – Porcentajes según días descontables', () => {

  const catalogo = new CatalogoTipoDeAusencia([ tipoEstandar('E01') ])
  const calc     = new CalculadoraPresentismo(catalogo)

  test('0 días descontables → porcentaje 100', () => {
    const resultado = calc.analizar(mockEmpleado([]), OCTUBRE, PRESENTISMO)
    expect(resultado.porcentaje).toBe(100)
    expect(resultado.total_descontables).toBe(0)
  })

  test('1 día descontable → porcentaje 70', () => {
    const resultado = calc.analizar(
      mockEmpleado([ ausenciaMes('E01', 2024, 10, 5, 5) ]),
      OCTUBRE, PRESENTISMO
    )
    expect(resultado.porcentaje).toBe(70)
    expect(resultado.total_descontables).toBe(1)
  })

  test('2 días descontables → porcentaje 40', () => {
    const resultado = calc.analizar(
      mockEmpleado([ ausenciaMes('E01', 2024, 10, 5, 6) ]),
      OCTUBRE, PRESENTISMO
    )
    expect(resultado.porcentaje).toBe(40)
    expect(resultado.total_descontables).toBe(2)
  })

  test('3 días descontables → porcentaje 0', () => {
    const resultado = calc.analizar(
      mockEmpleado([ ausenciaMes('E01', 2024, 10, 5, 7) ]),
      OCTUBRE, PRESENTISMO
    )
    expect(resultado.porcentaje).toBe(0)
    expect(resultado.total_descontables).toBe(3)
  })

})

// ===========================================================================
// 2. CORTE TOTAL
// ===========================================================================

describe('CalculadoraPresentismo – Corte total', () => {

  test('ausencia con corta=true → corte=true y porcentaje 0', () => {
    const catalogo = new CatalogoTipoDeAusencia([
      new TipoAusencia({ codigo: 'C01', nombre: 'Abandono', diasTope: 0, descuenta: true, corta: true })
    ])
    const calc     = new CalculadoraPresentismo(catalogo)
    const resultado = calc.analizar(
      mockEmpleado([ ausenciaMes('C01', 2024, 10, 10, 10) ]),
      OCTUBRE, PRESENTISMO
    )

    expect(resultado.corte).toBe(true)
    expect(resultado.porcentaje).toBe(0)
    expect(resultado.codigo_corte).toBe('C01')
  })

})

// ===========================================================================
// 3. TOPE — ausencia que NO descuenta porque está dentro del tope
// ===========================================================================

describe('CalculadoraPresentismo – Tope de días', () => {

  test('3 días con tope 5 → 0 descontables (dentro del tope)', () => {
    const catalogo = new CatalogoTipoDeAusencia([
      new TipoAusencia({ codigo: 'T01', nombre: 'Familiar', diasTope: 5, descuenta: true })
    ])
    const resultado = new CalculadoraPresentismo(catalogo).analizar(
      mockEmpleado([ ausenciaMes('T01', 2024, 10, 1, 3) ]),
      OCTUBRE, PRESENTISMO
    )
    expect(resultado.total_descontables).toBe(0)
    expect(resultado.porcentaje).toBe(100)
  })

  test('6 días con tope 5 → 1 descontable (excede en 1)', () => {
    const catalogo = new CatalogoTipoDeAusencia([
      new TipoAusencia({ codigo: 'T01', nombre: 'Familiar', diasTope: 5, descuenta: true })
    ])
    const resultado = new CalculadoraPresentismo(catalogo).analizar(
      mockEmpleado([ ausenciaMes('T01', 2024, 10, 1, 6) ]),
      OCTUBRE, PRESENTISMO
    )
    expect(resultado.total_descontables).toBe(1)
    expect(resultado.porcentaje).toBe(70)
  })

})

// ===========================================================================
// 4. ACUMULACIÓN HISTÓRICA
// ===========================================================================

describe('CalculadoraPresentismo – Acumulación histórica consume el tope', () => {

  test('tope 5, histórico 4, período 2 → 1 descontable', () => {
    const catalogo = new CatalogoTipoDeAusencia([
      new TipoAusencia({ codigo: 'T01', nombre: 'Familiar', diasTope: 5, descuenta: true })
    ])
    const emp = mockEmpleado([
      ausenciaMes('T01', 2024, 9,  1, 4),  // 4 días históricos en septiembre
      ausenciaMes('T01', 2024, 10, 5, 6),  // 2 días en octubre (período)
    ])
    const resultado = new CalculadoraPresentismo(catalogo).analizar(emp, OCTUBRE, PRESENTISMO)

    // Usó 4 de 5 → queda 1 libre → de los 2 del período, solo 1 descuenta
    expect(resultado.total_descontables).toBe(1)
    expect(resultado.porcentaje).toBe(70)
  })

  test('tope 5, histórico 5, período 2 → 2 descontables (tope agotado)', () => {
    const catalogo = new CatalogoTipoDeAusencia([
      new TipoAusencia({ codigo: 'T01', nombre: 'Familiar', diasTope: 5, descuenta: true })
    ])
    const emp = mockEmpleado([
      ausenciaMes('T01', 2024, 9,  1, 5),  // tope agotado en histórico
      ausenciaMes('T01', 2024, 10, 5, 6),  // 2 días en octubre
    ])
    const resultado = new CalculadoraPresentismo(catalogo).analizar(emp, OCTUBRE, PRESENTISMO)

    expect(resultado.total_descontables).toBe(2)
    expect(resultado.porcentaje).toBe(40)
  })

})
