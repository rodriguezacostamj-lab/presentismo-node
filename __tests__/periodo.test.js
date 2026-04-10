/**
 * Tests unitarios: Periodo.interseccion()
 * Basado en el código real de src/domain/entities/Periodo.js
 */

const Periodo = require('../src/domain/entities/Periodo')

// ---------------------------------------------------------------------------
// Helper: fecha limpia sin hora (igual que hace Periodo internamente)
// ---------------------------------------------------------------------------
function fecha(anio, mes, dia) {
  return new Date(anio, mes - 1, dia)
}

// ===========================================================================
// CASO ORO — ausencia 29/09 → 02/10 en período OCTUBRE = 2 días
// ===========================================================================

describe('Periodo – CASO ORO: ausencia que cruza el límite de mes', () => {

  test('ausencia 29/09 → 02/10 en período OCTUBRE → intersección 01/10 al 02/10', () => {
    const octubre = Periodo.mes(2024, 10)

    const inter = octubre.interseccion(
      fecha(2024, 9, 29),
      fecha(2024, 10, 2)
    )

    expect(inter).not.toBeNull()

    const [desde, hasta] = inter
    expect(desde).toEqual(fecha(2024, 10, 1))  // 01/10
    expect(hasta).toEqual(fecha(2024, 10, 2))  // 02/10
  })

  test('ausencia 29/09 → 02/10 en período SEPTIEMBRE → intersección 29/09 al 30/09', () => {
    const septiembre = Periodo.mes(2024, 9)

    const inter = septiembre.interseccion(
      fecha(2024, 9, 29),
      fecha(2024, 10, 2)
    )

    expect(inter).not.toBeNull()

    const [desde, hasta] = inter
    expect(desde).toEqual(fecha(2024, 9, 29))  // 29/09
    expect(hasta).toEqual(fecha(2024, 9, 30))  // 30/09
  })

})

// ===========================================================================
// Ausencia completamente dentro del período
// ===========================================================================

describe('Periodo – Ausencia completamente dentro del período', () => {

  test('ausencia 05/10 → 08/10 en octubre → devuelve las mismas fechas', () => {
    const octubre = Periodo.mes(2024, 10)
    const inter = octubre.interseccion(fecha(2024, 10, 5), fecha(2024, 10, 8))

    expect(inter).not.toBeNull()
    const [desde, hasta] = inter
    expect(desde).toEqual(fecha(2024, 10, 5))
    expect(hasta).toEqual(fecha(2024, 10, 8))
  })

  test('ausencia de 1 día dentro del período → devuelve ese día', () => {
    const octubre = Periodo.mes(2024, 10)
    const inter = octubre.interseccion(fecha(2024, 10, 15), fecha(2024, 10, 15))

    expect(inter).not.toBeNull()
    const [desde, hasta] = inter
    expect(desde).toEqual(fecha(2024, 10, 15))
    expect(hasta).toEqual(fecha(2024, 10, 15))
  })

})

// ===========================================================================
// Ausencia completamente fuera del período
// ===========================================================================

describe('Periodo – Ausencia fuera del período', () => {

  test('ausencia 05/09 → 10/09 en octubre → null', () => {
    const octubre = Periodo.mes(2024, 10)
    const inter = octubre.interseccion(fecha(2024, 9, 5), fecha(2024, 9, 10))
    expect(inter).toBeNull()
  })

  test('ausencia 01/11 → 05/11 en octubre → null', () => {
    const octubre = Periodo.mes(2024, 10)
    const inter = octubre.interseccion(fecha(2024, 11, 1), fecha(2024, 11, 5))
    expect(inter).toBeNull()
  })

})

// ===========================================================================
// Ausencia que abarca el mes completo
// ===========================================================================

describe('Periodo – Ausencia que engloba todo el período', () => {

  test('ausencia 01/09 → 30/11 en octubre → devuelve 01/10 al 31/10', () => {
    const octubre = Periodo.mes(2024, 10)
    const inter = octubre.interseccion(fecha(2024, 9, 1), fecha(2024, 11, 30))

    expect(inter).not.toBeNull()
    const [desde, hasta] = inter
    expect(desde).toEqual(fecha(2024, 10, 1))
    expect(hasta).toEqual(fecha(2024, 10, 31))
  })

})

// ===========================================================================
// Periodo.mes() — construcción correcta del período mensual
// ===========================================================================

describe('Periodo.mes() – construcción del período', () => {

  test('octubre 2024 → desde 01/10 hasta 31/10', () => {
    const octubre = Periodo.mes(2024, 10)
    expect(octubre.desde).toEqual(fecha(2024, 10, 1))
    expect(octubre.hasta).toEqual(fecha(2024, 10, 31))
  })

  test('febrero 2024 (bisiesto) → hasta 29/02', () => {
    const febrero = Periodo.mes(2024, 2)
    expect(febrero.hasta).toEqual(fecha(2024, 2, 29))
  })

  test('febrero 2023 (no bisiesto) → hasta 28/02', () => {
    const febrero = Periodo.mes(2023, 2)
    expect(febrero.hasta).toEqual(fecha(2023, 2, 28))
  })

})
