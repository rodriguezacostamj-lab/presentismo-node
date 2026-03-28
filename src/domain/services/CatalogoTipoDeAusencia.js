class CatalogoTipoDeAusencia {

    constructor(tipos = []) {
        this.tipos = {}
        for (const tipo of tipos) {
            this.tipos[tipo.codigo] = tipo
        }
    }

    obtener(codigo) {
        return this.tipos[codigo] ?? null
    }

    todos() {
        return Object.values(this.tipos)
    }
}

module.exports = CatalogoTipoDeAusencia