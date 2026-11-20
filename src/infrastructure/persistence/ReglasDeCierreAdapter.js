/**
 * ReglasDeCierreAdapter
 * Expone las reglas y el valor base de un período CERRADO con la misma
 * interfaz que ReglaRepository (obtenerTodas / obtenerParametro), para
 * poder reutilizar CalcularPresentismoUseCase sin modificarlo.
 */
class ReglasDeCierreAdapter {

    constructor({ reglasAplicadas, valorPremio }) {
        this.snapshot = typeof reglasAplicadas === 'string'
            ? JSON.parse(reglasAplicadas)
            : (reglasAplicadas ?? {})
        this.valorPremio = valorPremio
    }

    async obtenerTodas() {
        return this.snapshot.reglas ?? []
    }

    async obtenerParametro(clave) {
        if (clave === 'presentismo_base' && this.valorPremio != null) {
            return String(this.valorPremio)
        }
        return this.snapshot.parametros?.[clave] ?? null
    }
}

module.exports = ReglasDeCierreAdapter
