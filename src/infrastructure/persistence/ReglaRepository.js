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
    async crearRegla(campos) {
        return this.db.crearRegla(campos)
    }
    async eliminarRegla(codigo) {
        return this.db.eliminarRegla(codigo)
    }
    async obtenerEspecial(codigo) {
        return this.db.obtenerEspecial(codigo)
    }

    async guardarEspecial(codigo, bloques) {
        return this.db.guardarEspecial(codigo, bloques)
    }
}

module.exports = ReglaRepository