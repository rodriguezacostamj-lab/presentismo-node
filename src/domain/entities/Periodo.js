class Periodo {
    constructor(desde, hasta) {
        this.desde = new Date(desde)
        this.hasta = new Date(hasta)
    }

    contiene(fecha) {
        return fecha >= this.desde && fecha <= this.hasta
    }

    interseccion(aDesde, aHasta) {
        const desde = aDesde > this.desde ? aDesde : this.desde
        const hasta = aHasta < this.hasta ? aHasta : this.hasta

        if (desde > hasta) return null

        return [desde, hasta]
    }

    static mes(anio, mes) {
        const desde = new Date(anio, mes - 1, 1)
        const hasta = new Date(anio, mes, 0) // último día del mes

        return new Periodo(
            desde.toISOString().split('T')[0],
            hasta.toISOString().split('T')[0]
        )
    }
}

module.exports = Periodo