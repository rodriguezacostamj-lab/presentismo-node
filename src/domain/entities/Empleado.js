class Empleado {
    constructor({ cuil, nombre, funcionEjecutiva = false }) {
        this.cuil = cuil
        this.nombre = nombre
        this.funcionEjecutiva = funcionEjecutiva
        this.ausencias = []
    }

    agregarAusencia(ausencia) {
        this.ausencias.push(ausencia)
    }

    obtenerAusencias() {
        return this.ausencias
    }

    tieneFuncionEjecutiva() {
        return this.funcionEjecutiva === 'SI'
    }
}

module.exports = Empleado
