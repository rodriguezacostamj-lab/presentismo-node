class TipoAusencia {
    constructor({
        codigo,
        nombre,
        diasTope,
        descuenta,
        corta = false,
        regla = null,
        parametrosEspeciales = []
    }) {
        this.codigo = codigo
        this.nombre = nombre
        this.diasTope = diasTope
        this.descuenta = descuenta
        this.corta = corta
        this.regla = regla
        this.parametrosEspeciales = parametrosEspeciales
    }

    getTopeParaAusencia(ausencia) {
        if (this.parametrosEspeciales.length > 0) {
            return this.#evaluarCondiciones(ausencia)
        }
        return this.diasTope
    }

    resolverClave(ausencia) {
        if (this.parametrosEspeciales.length === 0) {
            return this.codigo
        }

        const bloques = [...this.parametrosEspeciales].sort(
            (a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999)
        )

        for (const bloque of bloques) {
            const condiciones = bloque.condiciones ?? []
            if (this.#cumpleTodasLasCondiciones(ausencia, condiciones)) {
                // La clave viene del bloque configurado, no hardcodeada
                return bloque.clave ?? this.codigo
            }
        }

        return this.codigo
    }

    #evaluarCondiciones(ausencia) {
        const bloques = [...this.parametrosEspeciales].sort(
            (a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999)
        )

        for (const bloque of bloques) {
            const condiciones = bloque.condiciones ?? []
            if (this.#cumpleTodasLasCondiciones(ausencia, condiciones)) {
                return bloque.tope ?? this.diasTope
            }
        }

        return this.diasTope
    }

    #cumpleTodasLasCondiciones(ausencia, condiciones) {
        return condiciones.every(c => this.#cumpleCondicion(ausencia, c))
    }

    #cumpleCondicion(ausencia, { campo, operador, valor }) {
        const actual = {
            discapacidad: ausencia.discapacidad,
            edad:         ausencia.edad,
            vinculo:      (ausencia.vinculo ?? '').toUpperCase(),
            nivel:        (ausencia.nivel ?? '').toUpperCase().trim(),
        }[campo]

        const v = typeof valor === 'string' ? valor.toUpperCase() : valor

        switch (operador) {
            case '=':        return actual === v
            case '>=':       return Number(actual) >= Number(v)
            case '<=':       return Number(actual) <= Number(v)
            case 'CONTIENE': return String(actual).includes(v)
            default:         return false
        }
    }
}

module.exports = TipoAusencia