let gridApi = null

// Inicializar AG Grid
function inicializarGrid() {
    const columnDefs = [
        { field: 'cuil',             headerName: 'CUIL',              width: 130 },
        { field: 'nombre',           headerName: 'NOMBRE',            flex: 1, minWidth: 200 },
        { field: 'diasDescontables', headerName: 'DÍAS DESCONTABLES', width: 160, type: 'numericColumn' },
        { field: 'porcentaje',       headerName: '%',                 width: 80,
            cellRenderer: p => `<strong>${p.value}%</strong>` },
        { field: 'alertas',          headerName: 'ALERTAS',           width: 120,
            cellRenderer: p => {
                let badges = ''
                if (p.data.funcionEjecutiva) badges += '<span class="badge-fe">FE</span> '
                if (p.data.cargoMayor)       badges += '<span class="badge-cmj">CMJ</span>'
                return badges || '—'
            }
        },
        { field: 'importeRrhh',      headerName: '$ RRHH',            width: 130,
            cellRenderer: p => p.value != null ? `$${p.value.toLocaleString('es-AR')}` : '—' },
        { field: 'importeEsperado',  headerName: '$ SUELDOS',         width: 130,
            cellRenderer: p => p.value != null ? `$${p.value.toLocaleString('es-AR')}` : '—' },
        { field: 'estado',           headerName: 'ESTADO',            width: 110,
            cellRenderer: p => {
                if (p.value === 'OK')          return '<span class="badge-ok">OK</span>'
                if (p.value === 'NO_COINCIDE') return '<span class="badge-revisar">Revisar</span>'
                return '—'
            }
        },
        { headerName: 'ACCIÓN', width: 110,
            cellRenderer: p => `<button class="btn btn-sm btn-outline-primary" onclick="verDetalle('${p.data.cuil}')">Ver más</button>`
        }
    ]

    const gridOptions = {
        columnDefs,
        rowData: [],
        defaultColDef: {
            sortable:   true,
            filter:     true,
            resizable:  true,
        },
        pagination:         true,
        paginationPageSize: 20,
    }

    const container = document.getElementById('grid-resultados')
    gridApi = agGrid.createGrid(container, gridOptions)
}

// Calcular
async function calcular() {
    const archivoAusencias = document.getElementById('archivo-ausencias').files[0]

    if (!archivoAusencias) {
        alert('Debe seleccionar el archivo de ausencias.')
        return
    }

    const formData = new FormData()
    formData.append('ausencias',   archivoAusencias)
    formData.append('desde_liq',   document.getElementById('desde_liq').value)
    formData.append('hasta_liq',   document.getElementById('hasta_liq').value)
    formData.append('desde_pres',  document.getElementById('desde_pres').value)
    formData.append('hasta_pres',  document.getElementById('hasta_pres').value)

    const archivoSueldos = document.getElementById('archivo-sueldos').files[0]
    if (archivoSueldos) {
        formData.append('sueldos', archivoSueldos)
    }

    try {
        const btn = document.querySelector('button[onclick="calcular()"]')
        btn.disabled = true
        btn.textContent = 'Calculando...'

        const response = await fetch('/api/presentismo/calcular', {
            method: 'POST',
            body:   formData
        })

        const data = await response.json()

        if (!response.ok) {
            alert('Error: ' + data.error)
            return
        }

        // Transformar datos para AG Grid
        const filas = data.resultados.map(r => ({
            cuil:             r.empleado.cuil,
            nombre:           r.empleado.nombre,
            diasDescontables: r.resultado.total_descontables,
            porcentaje:       r.resultado.porcentaje,
            funcionEjecutiva: r.empleado.funcionEjecutiva,
            cargoMayor:       r.empleado.cargoMayor,
            importeRrhh:      r.premio?.importe_rrhh ?? null,
            importeEsperado:  r.premio?.importe_esperado ?? null,
            estado:           r.premio?.estado ?? null,
            detalle:          r.resultado
        }))

        gridApi.setGridOption('rowData', filas)

    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message)
    } finally {
        const btn = document.querySelector('button[onclick="calcular()"]')
        btn.disabled = false
        btn.textContent = 'Calcular'
    }
}

// Ver detalle
function verDetalle(cuil) {
    alert('Detalle de ' + cuil + ' - próximamente')
}

// Limpiar
function limpiar() {
    gridApi.setGridOption('rowData', [])
    document.getElementById('archivo-ausencias').value = ''
    document.getElementById('archivo-sueldos').value = ''
}

// Mostrar sección
function mostrarSeccion(seccion) {
    document.getElementById('seccion-presentismo').style.display = seccion === 'presentismo' ? 'block' : 'none'
    document.getElementById('seccion-reglas').style.display      = seccion === 'reglas'      ? 'block' : 'none'

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    event.target.classList.add('active')
}

// Inicializar al cargar

document.addEventListener('DOMContentLoaded', () => {
    inicializarGrid()
    document.getElementById('buscador').addEventListener('input', e => {
        gridApi.setGridOption('quickFilterText', e.target.value)
    })
})