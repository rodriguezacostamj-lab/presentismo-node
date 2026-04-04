const LectorCSV = require('../infrastructure/readers/LectorCSV')
const LectorSueldos = require('../infrastructure/readers/LectorSueldos')
const CatalogoTipoDeAusencia = require('../domain/services/CatalogoTipoDeAusencia')
const CalculadoraPresentismo = require('../domain/services/CalculadoraPresentismo')
const ComparadorPremio = require('../domain/services/ComparadorPremio')
const Periodo = require('../domain/entities/Periodo')
const TipoAusencia = require('../domain/entities/TipoAusencia')

class CalcularPresentismoUseCase {

    constructor(repositorioReglas) {
        this.repositorioReglas = repositorioReglas
    }

    async ejecutar({
        rutaAusencias,
        rutaSueldos = null,
        desdeLiq,
        hastaLiq,
        desdePres,
        hastaPres
    }) {
        // 1. Cargar reglas desde la DB
        const reglas = await this.repositorioReglas.obtenerTodas()
        const tipos = reglas.map(r => new TipoAusencia(r))
        const catalogo = new CatalogoTipoDeAusencia(tipos)

        // 2. Leer valor base del presentismo
        const basePremio100 = parseFloat(
            await this.repositorioReglas.obtenerParametro('presentismo_base') ?? 0
        )

        // 3. Leer archivos
        const lectorCSV = new LectorCSV()
        const empleados = await lectorCSV.leerEmpleados(rutaAusencias)

        let sueldosPorCuil = {}
        if (rutaSueldos) {
            const lectorSueldos = new LectorSueldos()
            sueldosPorCuil = await lectorSueldos.leerPremios(rutaSueldos)
        }

        // 4. Preparar períodos
        const periodoLiquidacion = new Periodo(desdeLiq, hastaLiq)
        const periodoPresentismo = new Periodo(desdePres, hastaPres)

        // 5. Calcular y comparar
        const calc = new CalculadoraPresentismo(catalogo)
        const comparador = new ComparadorPremio()
        const resultados = []

        for (const emp of empleados) {
            const resultado = calc.analizar(emp, periodoLiquidacion, periodoPresentismo)

            emp.obtenerAusencias().forEach(a => {
                console.log('nivel:', a.nivel, '| causal:', a.causal, '| fechaDesde:', a.fechaDesde, '| fechaHasta:', a.fechaHasta)
            })
            const cuil = emp.cuil
            const infoSueldo = sueldosPorCuil[cuil] ?? null
            const porcentaje = resultado.porcentaje ?? 0

            // Detectar cargo mayor jerarquía
            const tieneCargoMayor = emp.obtenerAusencias().some(a =>
                (
                    (a.causal ?? '').toUpperCase().includes('CARGO MAYOR JERARQUIA') ||
                    (a.nivel ?? '').toUpperCase().includes('CARGO DE MAYOR JERARQUIA')
                ) &&
                a.fechaDesde <= periodoLiquidacion.hasta &&
                a.fechaHasta >= periodoLiquidacion.desde
            )

            const tieneAlertaEspecial = tieneCargoMayor || emp.tieneFuncionEjecutiva()

            // Calcular importe esperado
            const importeEsperado = Math.round(basePremio100 * (porcentaje / 100) * 100) / 100

            // Comparar con sueldos
            const estadoPremio = comparador.compararPremio(
                importeEsperado,
                infoSueldo,
                tieneAlertaEspecial
            )

            resultados.push({
                empleado: {
                    cuil,
                    nombre: emp.nombre,
                    funcionEjecutiva: emp.tieneFuncionEjecutiva(),
                    cargoMayor: tieneCargoMayor
                },
                resultado,
                premio: {
                    estado: estadoPremio,
                    importe_esperado: importeEsperado,
                    importe_rrhh: infoSueldo?.importe_rrhh ?? null
                },
                alertas: {
                    cargo_mayor: tieneCargoMayor,
                    funcion_ejecutiva: emp.tieneFuncionEjecutiva()
                }
            })
        }

        return resultados
    }

}


module.exports = CalcularPresentismoUseCase