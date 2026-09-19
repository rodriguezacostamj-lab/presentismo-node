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
}

module.exports = CierreRepository
