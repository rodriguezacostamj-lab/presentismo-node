let tabla = null

// Inicializar DataTable
function inicializarTabla() {
    tabla = $('#tabla-resultados').DataTable({
        data: [],
        columns: [
            { data: 'cuil' },
            { data: 'nombre' },
            { data: 'diasDescontables', className: 'text-center' },
            { data: 'porcentaje', className: 'text-center',
                render: d => `<strong>${d}%</strong>` },
            { data: null, className: 'text-center',
                render: (d, t, r) => {
                    let badges = ''
                    if (r.funcionEjecutiva) badges += '<span class="badge-fe">FE</span> '
                    if (r.cargoMayor)       badges += '<span class="badge-cmj">CMJ</span>'
                    return badges || '—'
                }
            },
            { data: 'importeRrhh',
                render: d => d != null ? `$${Number(d).toLocaleString('es-AR')}` : '—' },
            { data: 'importeEsperado',
                render: d => d != null ? `$${Number(d).toLocaleString('es-AR')}` : '—' },
            { data: 'estado', className: 'text-center',
                render: d => {
                    if (d === 'OK')          return '<span class="badge-ok">OK</span>'
                    if (d === 'NO_COINCIDE') return '<span class="badge-revisar">Revisar</span>'
                    return '—'
                }
            },
            { data: 'cuil', className: 'text-center',
                render: d => `<button class="btn-ver" onclick="verDetalle('${d}')">Ver más</button>` }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        pageLength: 20,
        dom: '<"d-flex justify-content-between mb-2"Bf>rtip',
        buttons: [
            { extend: 'excel', text: '📥 Excel', className: 'btn btn-sm btn-outline-success' },
            { extend: 'print', text: '🖨️ Imprimir', className: 'btn btn-sm btn-outline-secondary' }
        ]
    })
}

// Calcular
async function calcular() {
    const archivoAusencias = document.getElementById('archivo-ausencias').files[0]

    if (!archivoAusencias) {
        alert('Debe seleccionar el archivo de ausencias.')
        return
    }

    const formData = new FormData()
    formData.append('ausencias',  archivoAusencias)
    formData.append('desde_liq',  document.getElementById('desde_liq').value)
    formData.append('hasta_liq',  document.getElementById('hasta_liq').value)
    formData.append('desde_pres', document.getElementById('desde_pres').value)
    formData.append('hasta_pres', document.getElementById('hasta_pres').value)

    const archivoSueldos = document.getElementById('archivo-sueldos').files[0]
    if (archivoSueldos) formData.append('sueldos', archivoSueldos)

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

        tabla.clear().rows.add(filas).draw()

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
    tabla.clear().draw()
    document.getElementById('archivo-ausencias').value = ''
    document.getElementById('archivo-sueldos').value = ''
}

// Mostrar sección
function mostrarSeccion(seccion, el) {
    document.getElementById('seccion-presentismo').style.display = seccion === 'presentismo' ? 'block' : 'none'
    document.getElementById('seccion-reglas').style.display      = seccion === 'reglas'      ? 'block' : 'none'
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    el.classList.add('active')
}

// Inicializar al cargar
$(document).ready(() => inicializarTabla())