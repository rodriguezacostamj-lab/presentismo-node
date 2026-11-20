class CierreRepository {

    constructor(db) {
        this.db = db
    }

    async obtenerSnapshotReglas() {
        return this.db.obtenerSnapshotReglas()
    }

    async cerrarPeriodo({ periodo_presentismo_desde, periodo_presentismo_hasta, periodo_liquidacion, valor_premio, reglas_aplicadas }) {
        return this.db.crearCierre({ periodo_presentismo_desde, periodo_presentismo_hasta, periodo_liquidacion, valor_premio, reglas_aplicadas })
    }

    async guardarResultados(cierreId, resultados) {
        return this.db.crearResultadosCalculo(cierreId, resultados)
    }

    async obtenerCierres(filtros) {
        return this.db.obtenerCierres(filtros)
    }

    async buscarPorEmpleado(filtros) {
        return this.db.buscarResultadosPorEmpleado(filtros)
    }

    async eliminarCierre(id) {
        return this.db.eliminarCierre(id)
    }

    async obtenerCierre(id) {
        return this.db.obtenerCierre(id)
    }

    async obtenerResultadosCierre(cierreId) {
        return this.db.obtenerResultadosCierre(cierreId)
    }

    async marcarComoEditado(cierreId) {
        return this.db.marcarCierreComoEditado(cierreId)
    }

    async actualizarResultado(id, campos) {
        return this.db.actualizarResultadoCalculo(id, campos)
    }
    async obtenerRetrosPorCierre(cierreId) {
         return this.db.obtenerRetrosPorCierre(cierreId) }

    async crearRetro(datos) { 
        return this.db.crearRetro(datos) }
        async obtenerPeriodosConRetros() {
        return this.db.obtenerPeriodosConRetros()
    }

    async obtenerRetrosParaExportar(periodos) {
        return this.db.obtenerRetrosParaExportar(periodos)
    }
        async eliminarRetro(id) {
        return this.db.eliminarRetro(id)
    }
}

module.exports = CierreRepository
