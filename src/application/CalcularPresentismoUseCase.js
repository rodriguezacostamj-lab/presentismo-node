const LectorCSV = require('../infrastructure/readers/LectorCSV')
const LectorSueldos = require('../infrastructure/readers/LectorSueldos')
const CatalogoTipoDeAusencia = require('../domain/services/CatalogoTipoDeAusencia')
const CalculadoraPresentismo = require('../domain/services/CalculadoraPresentismo')
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
        const reglas   = await this.repositorioReglas.obtenerTodas()
        const tipos    = reglas.map(r => new TipoAusencia(r))
        const catalogo = new CatalogoTipoDeAusencia(tipos)

        // 2. Leer archivos
        const lectorCSV = new LectorCSV()
        const empleados = await lectorCSV.leerEmpleados(rutaAusencias)

        let sueldosPorCuil = {}
        if (rutaSueldos) {
            const lectorSueldos = new LectorSueldos()
            sueldosPorCuil = await lectorSueldos.leerPremios(rutaSueldos)
        }

        // 3. Preparar períodos
        const periodoLiquidacion = new Periodo(desdeLiq, hastaLiq)
        const periodoPresentismo = new Periodo(desdePres, hastaPres)

        // 4. Calcular
        const calc = new CalculadoraPresentismo(catalogo)
        const resultados = []

        for (const emp of empleados) {
            const resultado = calc.analizar(emp, periodoLiquidacion, periodoPresentismo)

            const cuil          = emp.cuil
            const infoSueldo    = sueldosPorCuil[cuil] ?? null
            const porcentaje    = resultado.porcentaje ?? 0

            resultados.push({
                empleado: {
                    cuil,
                    nombre:            emp.nombre,
                    funcionEjecutiva:  emp.tieneFuncionEjecutiva()
                },
                resultado,
                sueldo: infoSueldo,
                porcentaje
            })
        }

        return resultados
    }
}

module.exports = CalcularPresentismoUseCase