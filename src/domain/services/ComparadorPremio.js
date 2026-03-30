class ComparadorPremio {

    static OK = 'OK'
    static NO_COINCIDE = 'NO_COINCIDE'
    static NO_EXISTE = 'NO_EXISTE'

    compararPremio(importeEsperado, infoSueldo, tieneAlertaEspecial = false) {

        // No existe en sueldos
        if (infoSueldo === null) {
            if (tieneAlertaEspecial) return ComparadorPremio.OK
            if (Math.round(importeEsperado * 100) / 100 > 0) return ComparadorPremio.NO_COINCIDE
            return ComparadorPremio.OK
        }

        const importeRrhh = parseFloat(infoSueldo.importe_rrhh ?? 0)

        if (
            Math.round(importeEsperado * 100) / 100 ===
            Math.round(importeRrhh * 100) / 100
        ) {
            return ComparadorPremio.OK
        }

        return ComparadorPremio.NO_COINCIDE
    }
}

module.exports = ComparadorPremio