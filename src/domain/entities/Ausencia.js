class Ausencia {
    constructor({
        codigo,
        dias,
        fechaDesde = null,
        fechaHasta = null,
        nivel = null,
        vinculo = null,
        edad = null,
        discapacidad = false
    }) {
        this.codigo = codigo
        this.dias = dias
        this.fechaDesde = fechaDesde ? new Date(fechaDesde) : null
        this.fechaHasta = fechaHasta ? new Date(fechaHasta) : null
        this.nivel = nivel
        this.vinculo = vinculo
        this.edad = edad
        this.discapacidad = discapacidad
    }
}

module.exports = Ausencia