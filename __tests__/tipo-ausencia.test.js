/**
 * Tests unitarios: TipoAusencia
 * Basado en el código real de src/domain/entities/TipoAusencia.js
 *
 * Cubre:
 *   - getTopeParaAusencia() con y sin parametrosEspeciales
 *   - resolverClave() con condiciones
 *   - Reglas especiales tipo 10J (condición laboral/vinculo) y 13A (nivel educativo)
 */

const TipoAusencia = require('../src/domain/entities/TipoAusencia')

// ===========================================================================
// Tipo simple — sin parametrosEspeciales
// ===========================================================================

describe('TipoAusencia – Sin parámetros especiales', () => {

  const tipo = new TipoAusencia({
    codigo:   'A01',
    nombre:   'Enfermedad común',
    diasTope: 30,
    descuenta: true,
  })

  test('getTopeParaAusencia() devuelve diasTope directo', () => {
    const ausencia = { codigo: 'A01', dias: 5 }
    expect(tipo.getTopeParaAusencia(ausencia)).toBe(30)
  })

  test('resolverClave() devuelve el código del tipo', () => {
    const ausencia = { codigo: 'A01', dias: 5 }
    expect(tipo.resolverClave(ausencia)).toBe('A01')
  })

})

// ===========================================================================
// Regla especial tipo 13A — nivel educativo
// ===========================================================================
// Condición: nivel educativo UNIVERSITARIO → tope diferente

describe('TipoAusencia – 13A: nivel educativo', () => {

  const tipo13A = new TipoAusencia({
    codigo:   '13A',
    nombre:   'Estudio universitario',
    diasTope: 2,        // tope base
    descuenta: true,
    parametrosEspeciales: [
      {
        prioridad:   1,
        clave:       '13A_UNIV',
        tope:        10,         // universitario tiene más días
        condiciones: [
          { campo: 'nivel', operador: '=', valor: 'UNIVERSITARIO' }
        ]
      },
      {
        prioridad:   2,
        clave:       '13A_SEC',
        tope:        2,
        condiciones: [
          { campo: 'nivel', operador: '=', valor: 'SECUNDARIO' }
        ]
      }
    ]
  })

  test('nivel UNIVERSITARIO → tope 10', () => {
    const ausencia = { codigo: '13A', dias: 5, nivel: 'UNIVERSITARIO' }
    expect(tipo13A.getTopeParaAusencia(ausencia)).toBe(10)
  })

  test('nivel SECUNDARIO → tope 2', () => {
    const ausencia = { codigo: '13A', dias: 1, nivel: 'SECUNDARIO' }
    expect(tipo13A.getTopeParaAusencia(ausencia)).toBe(2)
  })

  test('nivel no reconocido → tope base (diasTope)', () => {
    const ausencia = { codigo: '13A', dias: 1, nivel: 'PRIMARIO' }
    expect(tipo13A.getTopeParaAusencia(ausencia)).toBe(2)
  })

  test('resolverClave() universitario → clave 13A_UNIV', () => {
    const ausencia = { codigo: '13A', dias: 5, nivel: 'universitario' } // minúscula → debe normalizar
    expect(tipo13A.resolverClave(ausencia)).toBe('13A_UNIV')
  })

  test('resolverClave() secundario → clave 13A_SEC', () => {
    const ausencia = { codigo: '13A', dias: 1, nivel: 'SECUNDARIO' }
    expect(tipo13A.resolverClave(ausencia)).toBe('13A_SEC')
  })

})

// ===========================================================================
// Regla especial tipo 10J — condición por vínculo/edad
// ===========================================================================
// Condición: discapacidad → tope mayor

describe('TipoAusencia – 10J: condición por discapacidad', () => {

  const tipo10J = new TipoAusencia({
    codigo:   '10J',
    nombre:   'Enfermedad familiar',
    diasTope: 3,
    descuenta: true,
    parametrosEspeciales: [
      {
        prioridad:   1,
        clave:       '10J_DISC',
        tope:        30,
        condiciones: [
          { campo: 'discapacidad', operador: '=', valor: true }
        ]
      },
      {
        prioridad:   2,
        clave:       '10J_MENOR',
        tope:        5,
        condiciones: [
          { campo: 'edad', operador: '<=', valor: 12 }
        ]
      }
    ]
  })

  test('discapacidad = true → tope 30', () => {
    const ausencia = { codigo: '10J', dias: 10, discapacidad: true, edad: 8 }
    expect(tipo10J.getTopeParaAusencia(ausencia)).toBe(30)
  })

  test('discapacidad = false, edad 8 → tope 5 (menor de 12)', () => {
    const ausencia = { codigo: '10J', dias: 3, discapacidad: false, edad: 8 }
    expect(tipo10J.getTopeParaAusencia(ausencia)).toBe(5)
  })

  test('discapacidad = false, edad 15 → tope base 3', () => {
    const ausencia = { codigo: '10J', dias: 2, discapacidad: false, edad: 15 }
    expect(tipo10J.getTopeParaAusencia(ausencia)).toBe(3)
  })

  test('resolverClave() con discapacidad → 10J_DISC', () => {
    const ausencia = { codigo: '10J', dias: 5, discapacidad: true, edad: 5 }
    expect(tipo10J.resolverClave(ausencia)).toBe('10J_DISC')
  })

  test('resolverClave() sin discapacidad, menor → 10J_MENOR', () => {
    const ausencia = { codigo: '10J', dias: 2, discapacidad: false, edad: 10 }
    expect(tipo10J.resolverClave(ausencia)).toBe('10J_MENOR')
  })

  test('resolverClave() sin condición especial → código base 10J', () => {
    const ausencia = { codigo: '10J', dias: 1, discapacidad: false, edad: 20 }
    expect(tipo10J.resolverClave(ausencia)).toBe('10J')
  })

})
