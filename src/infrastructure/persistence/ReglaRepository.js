class ReglaRepository {

    constructor(db) {
        this.db = db
    }

    async obtenerTodas() {
        return this.db.obtenerReglas()
    }

    async obtenerParametro(clave) {
        return this.db.obtenerParametro(clave)
    }
}

module.exports = ReglaRepository