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
    async actualizarParametro(clave, valor) {
        return this.db.actualizarParametro(clave, valor)
    }
    async obtenerTodas() {
        return this.db.obtenerReglas()
    }

    async actualizarRegla(codigo, campos) {
        return this.db.actualizarRegla(codigo, campos)
    }
}

module.exports = ReglaRepository