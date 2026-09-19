let tabla = null
let resultadosCache = {}
let periodosCache = {}

const fmtPesos = v => v != null
    ? '$\u00A0' + Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '<span class="text-muted" style="font-size:0.7rem;letter-spacing:.05em;">s/d</span>'

// Inicializar DataTable
function inicializarTabla() {
    tabla = $('#tabla-resultados').DataTable({
        data: [],
        columns: [
            { data: 'cuil' },
            { data: 'nombre' },
            { data: 'diasDescontables', className: 'text-center' },
            {
                data: 'porcentaje', className: 'text-center',
                render: d => `<strong>${d}%</strong>`
            },
            {
                data: null, className: 'text-center',
                render: (d, t, r) => {
                    let badges = ''
                    if (r.funcionEjecutiva) badges += '<span class="badge-fe">FE</span> '
                    if (r.cargoMayor) badges += '<span class="badge-cmj">CMJ</span>'
                    if (r.sinAusencias) badges += '<span class="badge-sinausencias">S/Ausencias</span>'
                    return badges || ''
                }
            },
            {
                data: 'importeRrhh',
                render: d => d != null ? `$${Number(d).toLocaleString('es-AR')}` : '—'
            },
            {
                data: 'importeEsperado',
                render: d => d != null ? `$${Number(d).toLocaleString('es-AR')}` : '—'
            },
            {
                data: 'estado', className: 'text-center',
                render: d => {
                    if (d === 'OK') return '<span class="badge-ok">OK</span>'
                    if (d === 'NO_COINCIDE') return '<span class="badge-revisar">Revisar</span>'
                    if (d === 'NO_EXISTE') return '<span class="badge-noexiste">No existe</span>'
                    return ''
                }
            },
            {
                data: 'cuil', className: 'text-center',
                render: d => `<button class="btn-icon" onclick="verDetalle('${d}')" title="Ver detalle"><i class="bi bi-eye"></i></button>`
            }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        pageLength: 20,
        dom: '<"d-flex justify-content-between mb-2"Bf>rtip',
        buttons: [
            {
                extend: 'excel',
                text: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>',
                titleAttr: 'Excel',
                className: 'btn btn-sm',
                attr: { style: 'background-color:#0b1738;color:white;padding:5px 8px;border:none;border-radius:4px;' }
            },
            {
                extend: 'pdf',
                text: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>',
                titleAttr: 'PDF',
                className: 'btn btn-sm',
                attr: { style: 'background-color:#0b1738;color:white;padding:5px 8px;border:none;border-radius:4px;' }
            },
            {
                extend: 'print',
                text: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/></svg>',
                titleAttr: 'Imprimir',
                className: 'btn btn-sm',
                attr: { style: 'background-color:#0b1738;color:white;padding:5px 8px;border:none;border-radius:4px;' }
            }
        ],
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
    formData.append('ausencias', archivoAusencias)
    formData.append('desde_liq', document.getElementById('desde_liq').value)
    formData.append('hasta_liq', document.getElementById('hasta_liq').value)
    formData.append('desde_pres', document.getElementById('desde_pres').value)
    formData.append('hasta_pres', document.getElementById('hasta_pres').value)

    const archivoSueldos = document.getElementById('archivo-sueldos').files[0]
    if (archivoSueldos) formData.append('sueldos', archivoSueldos)

    periodosCache = {
        desde_pres: document.getElementById('desde_pres').value,
        hasta_pres: document.getElementById('hasta_pres').value,
        desde_liq: document.getElementById('desde_liq').value,
        hasta_liq: document.getElementById('hasta_liq').value,
    }

    try {
        const btn = document.querySelector('button[onclick="calcular()"]')
        btn.disabled = true
        btn.textContent = 'Calculando...'

        const response = await fetch('/api/presentismo/calcular', {
            method: 'POST',
            body: formData
        })

        const data = await response.json()

        if (!response.ok) {
            alert('Error: ' + data.error)
            return
        }

        const filas = data.resultados.map(r => {
            resultadosCache[r.empleado.cuil] = r
            return {
                cuil: r.empleado.cuil,
                nombre: r.empleado.nombre,
                diasDescontables: r.resultado.total_descontables,
                porcentaje: r.resultado.porcentaje,
                funcionEjecutiva: r.empleado.funcionEjecutiva,
                cargoMayor: r.empleado.cargoMayor,
                sinAusencias: r.empleado.sinAusencias ?? false,
                importeRrhh: r.premio?.importe_esperado ?? null,
                importeEsperado: r.premio?.importe_rrhh ?? null,
                estado: r.premio?.estado ?? null,
                detalle: r.resultado
            }
        })



        tabla.clear().rows.add(filas).draw()
        document.getElementById('btn-cerrar-periodo').disabled = filas.length === 0

    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message)
    } finally {
        const btn = document.querySelector('button[onclick="calcular()"]')
        btn.disabled = false
        btn.textContent = 'Calcular'
    }
}
// ver detalle
window.verDetalle = function (cuil) {
    const datos = resultadosCache[cuil]
    if (!datos) return

    const r = datos.resultado
    const emp = datos.empleado

    document.getElementById('det-periodo-pres').textContent =
        `${formatearFecha(periodosCache.desde_pres)} al ${formatearFecha(periodosCache.hasta_pres)}`
    document.getElementById('det-periodo-liq').textContent =
        `${formatearFecha(periodosCache.desde_liq)} al ${formatearFecha(periodosCache.hasta_liq)}`

    // Resumen
    document.getElementById('det-nombre').textContent = emp.nombre
    document.getElementById('det-cuil').textContent = emp.cuil
    document.getElementById('det-descontables').textContent = r.total_descontables
    document.getElementById('det-porcentaje').textContent = r.porcentaje + '%'

    // Detalle de ausencias
    const tbDetalle = document.getElementById('det-tabla-detalle')
    tbDetalle.innerHTML = ''
    for (const d of r.detalle) {
        tbDetalle.innerHTML += `
            <tr>
                <td>${d.codigo}</td>
                <td>${d.nombre}</td>
                <td><small class="text-muted">${d.explicacion_tope ?? 'Tope general'}</small></td>
                <td class="text-center">${d.historicos}</td>
                <td class="text-center">${d.dias}</td>
                <td class="text-center">${d.tope}</td>
                <td class="text-center"><strong>${d.descontables}</strong></td>
            </tr>
        `
    }
    document.getElementById('det-total-descontables').textContent = r.total_descontables

    // Ausencias del período
    const tbPeriodo = document.getElementById('det-ausencias-periodo')
    tbPeriodo.innerHTML = ''
    for (const a of r.ausenciasPeriodo) {
        tbPeriodo.innerHTML += `
            <tr>
                <td>${a.codigo}</td>
                <td>${a.nivel && a.nivel !== 'null' ? a.nivel : ''}</td>
                <td>${a.vinculo && a.vinculo !== 'null' ? a.vinculo : ''}</td>
                <td>${formatearFecha(a.fechaDesde)}</td>
                <td>${formatearFecha(a.fechaHasta)}</td>
                <td class="text-center">${a.dias}</td>
            </tr>
        `
    }

    // Ausencias históricas
    const tbHistoricas = document.getElementById('det-ausencias-historicas')
    tbHistoricas.innerHTML = ''
    for (const a of r.ausenciasHistoricas) {
        tbHistoricas.innerHTML += `
            <tr>
                <td>${a.codigo}</td>
                <td>${a.nivel && a.nivel !== 'null' ? a.nivel : ''}</td>
                <td>${a.vinculo && a.vinculo !== 'null' ? a.vinculo : ''}</td>
                <td>${formatearFecha(a.fechaDesde)}</td>
                <td>${formatearFecha(a.fechaHasta)}</td>
                <td class="text-center">${a.dias}</td>
            </tr>
        `
    }

    // Mostrar sección detalle
    mostrarSeccionDetalle()
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '—'
    const [anio, mes, dia] = fechaStr.split('T')[0].split('-')
    return `${parseInt(dia)}/${parseInt(mes)}/${anio}`
}

function ocultarTodasSecciones() {
    ;['seccion-presentismo','seccion-reglas','seccion-historial','seccion-detalle','seccion-especial']
        .forEach(id => document.getElementById(id).style.display = 'none')
}

function mostrarSeccionDetalle() {
    ocultarTodasSecciones()
    document.getElementById('seccion-detalle').style.display = 'block'
}

function volverAlListado() {
    ocultarTodasSecciones()
    document.getElementById('seccion-presentismo').style.display = 'block'
}

// Limpiar
function limpiar() {
    tabla.clear().draw()
    resultadosCache = {}
    document.getElementById('archivo-ausencias').value = ''
    document.getElementById('archivo-sueldos').value = ''
    document.getElementById('btn-cerrar-periodo').disabled = true
}

// Mostrar sección
function mostrarSeccion(seccion, el) {
    ocultarTodasSecciones()
    document.getElementById('seccion-' + seccion).style.display = 'block'
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    el.classList.add('active')

    if (seccion === 'reglas') cargarReglas()
    if (seccion === 'historial') cargarHistorial()
}

// Inicializar al cargar
$(document).ready(async () => {
    // Verificar si hay sesión activa
    const response = await fetch('/api/auth/me')

    if (response.ok) {
        // Hay sesión activa, ocultar login
        document.getElementById('pantalla-login').style.display = 'none'
    }

    inicializarTabla()
})

// ================================
// REGLAS
// ================================
let tablaReglas = null

async function cargarReglas() {
    const response = await fetch('/api/reglas')
    const data = await response.json()

    // Valor base
    const resParametros = await fetch('/api/reglas/parametros')
    const parametros = await resParametros.json()
    const valorBase = parametros.presentismo_base
    document.getElementById('input-valor-base').value = valorBase
    document.getElementById('badge-valor-base').textContent = `Valor Presentismo $${Number(valorBase).toLocaleString('es-AR')}`

    // Tabla de reglas
    if (tablaReglas) {
        tablaReglas.clear().rows.add(data.reglas).draw()
        return
    }

    tablaReglas = $('#tabla-reglas').DataTable({
        data: data.reglas,
        columns: [
            { data: 'codigo' },
            { data: 'nombre' },
            { data: 'diasTope', className: 'text-center' },
            {
                data: 'descuenta', className: 'text-center',
                render: d => d ? '✔' : '✖'
            },
            {
                data: 'corta', className: 'text-center',
                render: d => d ? '✔' : '✖'
            },
            {
                data: 'activa', className: 'text-center',
                render: d => d ? '✔' : '✖'
            },
            {
                data: null,
                render: (d, t, r) => `
    <button class="btn-ver" style="background-color:#0d6efd;" onclick="editarRegla('${r.codigo}')">Editar</button>
    <button class="btn-ver" style="background-color:#dc3545;margin-left:4px;" onclick="toggleRegla('${r.codigo}', ${r.activa})">
        ${r.activa ? 'Desactivar' : 'Activar'}
    </button>
    <button class="btn-ver" style="background-color:#6c757d;margin-left:4px;" onclick="eliminarRegla('${r.codigo}')">Eliminar</button>
    ${r.regla ? `<button class="btn-ver" style="background-color:#ffc107;color:black;margin-left:4px;" onclick="abrirReglaEspecial('${r.codigo}')">⚙</button>` : ''}
`
            }
        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        },
        pageLength: 20,
        dom: '<"d-flex justify-content-between mb-2"f>rtip',
        buttons: []
    })
}

async function guardarValorBase() {
    const valor = document.getElementById('input-valor-base').value
    if (!valor) return

    const response = await fetch('/api/reglas/parametros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: 'presentismo_base', valor })
    })

    const data = await response.json()
    if (response.ok) {
        document.getElementById('badge-valor-base').textContent =
            `Valor Presentismo $${Number(valor).toLocaleString('es-AR')}`
        alert('Valor actualizado correctamente.')
    } else {
        alert('Error: ' + data.error)
    }
}

window.toggleRegla = async function (codigo, activa) {
    const response = await fetch(`/api/reglas/${codigo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: !activa })
    })

    if (response.ok) cargarReglas()
}

window.editarRegla = function (codigo) {
    const regla = tablaReglas.data().toArray().find(r => r.codigo === codigo)
    if (!regla) return

    document.getElementById('edit-codigo').value = regla.codigo
    document.getElementById('edit-codigo-display').value = regla.codigo
    document.getElementById('edit-nombre').value = regla.nombre
    document.getElementById('edit-tope').value = regla.diasTope
    document.getElementById('edit-descuenta').checked = regla.descuenta
    document.getElementById('edit-corta').checked = regla.corta
    document.getElementById('edit-activa').checked = regla.activa

    const modal = new bootstrap.Modal(document.getElementById('modalEditarRegla'))
    modal.show()
}

async function guardarRegla() {
    const codigo = document.getElementById('edit-codigo').value
    const nombre = document.getElementById('edit-nombre').value
    const tope = parseInt(document.getElementById('edit-tope').value)
    const descuenta = document.getElementById('edit-descuenta').checked
    const corta = document.getElementById('edit-corta').checked
    const activa = document.getElementById('edit-activa').checked

    const response = await fetch(`/api/reglas/${codigo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, tope, descuenta, corta, activa })
    })

    const data = await response.json()

    if (response.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalEditarRegla')).hide()
        cargarReglas()
    } else {
        alert('Error: ' + data.error)
    }
}
window.eliminarRegla = async function (codigo) {
    if (!confirm(`¿Seguro que querés eliminar la regla ${codigo}? Esta acción no se puede deshacer.`)) return

    const response = await fetch(`/api/reglas/${codigo}`, {
        method: 'DELETE'
    })

    const data = await response.json()

    if (response.ok) {
        cargarReglas()
    } else {
        alert('Error: ' + data.error)
    }
}

function abrirModalNuevaRegla() {
    // Limpiar campos
    document.getElementById('nueva-codigo').value = ''
    document.getElementById('nueva-nombre').value = ''
    document.getElementById('nueva-tope').value = '0'
    document.getElementById('nueva-descuenta').checked = false
    document.getElementById('nueva-corta').checked = false
    document.getElementById('nueva-activa').checked = true

    const modal = new bootstrap.Modal(document.getElementById('modalNuevaRegla'))
    modal.show()
}

async function crearRegla() {
    const codigo = document.getElementById('nueva-codigo').value.trim()
    const nombre = document.getElementById('nueva-nombre').value.trim()
    const tope = parseInt(document.getElementById('nueva-tope').value)
    const descuenta = document.getElementById('nueva-descuenta').checked
    const corta = document.getElementById('nueva-corta').checked
    const activa = document.getElementById('nueva-activa').checked

    if (!codigo || !nombre) {
        alert('Código y nombre son obligatorios.')
        return
    }

    const response = await fetch('/api/reglas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, nombre, tope, descuenta, corta, activa })
    })

    const data = await response.json()

    if (response.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalNuevaRegla')).hide()
        cargarReglas()
    } else {
        alert('Error: ' + data.error)
    }
}
// ================================
// REGLAS ESPECIALES
// ================================
let codigoEspecialActual = null
let bloquesEspecial = []

window.abrirReglaEspecial = async function (codigo) {
    codigoEspecialActual = codigo

    const response = await fetch(`/api/reglas/${codigo}/especial`)
    const data = await response.json()

    document.getElementById('especial-codigo').textContent = codigo
    document.getElementById('especial-activa').checked = data.especial?.activa ?? true

    bloquesEspecial = data.especial?.bloques ?? []
    renderizarBloques()

    ocultarTodasSecciones()
    document.getElementById('seccion-especial').style.display = 'block'
}

function renderizarBloques() {
    const contenedor = document.getElementById('contenedor-bloques')
    contenedor.innerHTML = ''

    const camposDisponibles = {
        discapacidad: 'Discapacidad',
        edad: 'Edad',
        vinculo: 'Vínculo',
        nivel: 'Nivel educativo'
    }

    const camposPermitidos = obtenerCamposPorCodigo(codigoEspecialActual)

    bloquesEspecial.forEach((bloque, index) => {

        const opcionesCampo = camposPermitidos.map(c => `
            <option value="${c}" ${bloque.condiciones?.[0]?.campo === c ? 'selected' : ''}>
                ${camposDisponibles[c]}
            </option>
        `).join('')

        contenedor.innerHTML += `
            <div class="card shadow-sm mb-3" id="bloque-${index}">
                <div class="card-body">
                    <div class="row g-3 mb-3">
                        <div class="col-md-2">
                            <label class="form-label small">Prioridad</label>
                            <input type="number" class="form-control form-control-sm" 
                                value="${bloque.prioridad}" 
                                onchange="actualizarBloque(${index}, 'prioridad', this.value)">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small">Tope</label>
                            <input type="number" class="form-control form-control-sm" 
                                value="${bloque.tope}" 
                                onchange="actualizarBloque(${index}, 'tope', this.value)">
                        </div>
                        <div class="col-md-8">
                            <label class="form-label small">Descripción</label>
                            <input type="text" class="form-control form-control-sm" 
                                value="${bloque.descripcion ?? ''}" 
                                onchange="actualizarBloque(${index}, 'descripcion', this.value)">
                        </div>
                    </div>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label small">Campo</label>
                            <select class="form-select form-select-sm" onchange="actualizarCondicion(${index}, 'campo', this.value)">
                                ${opcionesCampo}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small">Operador</label>
                            <select class="form-select form-select-sm" onchange="actualizarCondicion(${index}, 'operador', this.value)">
                                <option value="="        ${bloque.condiciones?.[0]?.operador === '=' ? 'selected' : ''}>Es</option>
                                <option value=">="       ${bloque.condiciones?.[0]?.operador === '>=' ? 'selected' : ''}>≥</option>
                                <option value="<="       ${bloque.condiciones?.[0]?.operador === '<=' ? 'selected' : ''}>≤</option>
                                <option value="CONTIENE" ${bloque.condiciones?.[0]?.operador === 'CONTIENE' ? 'selected' : ''}>Contiene</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small">Valor</label>
                            <input type="text" class="form-control form-control-sm" 
                                value="${bloque.condiciones?.[0]?.valor ?? ''}" 
                                onchange="actualizarCondicion(${index}, 'valor', this.value)">
                        </div>
                    </div>
                    <div class="text-end mt-3">
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarBloque(${index})">🗑️ Eliminar bloque</button>
                    </div>
                </div>
            </div>
        `
    })
}

function actualizarBloque(index, campo, valor) {
    if (campo === 'prioridad' || campo === 'tope') {
        bloquesEspecial[index][campo] = parseInt(valor)
    } else {
        bloquesEspecial[index][campo] = valor
    }
}

function actualizarCondicion(index, campo, valor) {
    if (!bloquesEspecial[index].condiciones) {
        bloquesEspecial[index].condiciones = [{}]
    }
    bloquesEspecial[index].condiciones[0][campo] = valor
}

function agregarBloque() {
    bloquesEspecial.push({
        prioridad: bloquesEspecial.length + 1,
        tope: 1,
        descripcion: '',
        condiciones: [{ campo: 'edad', operador: '=', valor: '' }]
    })
    renderizarBloques()
}

function eliminarBloque(index) {
    bloquesEspecial.splice(index, 1)
    renderizarBloques()
}

function eliminarTodosLosBloques() {
    if (!confirm('¿Seguro que querés eliminar todos los bloques?')) return
    bloquesEspecial = []
    renderizarBloques()
}

async function guardarEspecial() {
    const response = await fetch(`/api/reglas/${codigoEspecialActual}/especial`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloques: bloquesEspecial })
    })

    const data = await response.json()

    if (response.ok) {
        alert('Regla especial guardada correctamente.')
        volverAReglas()
    } else {
        alert('Error: ' + data.error)
    }
}

function volverAReglas() {
    ocultarTodasSecciones()
    document.getElementById('seccion-reglas').style.display = 'block'
    cargarReglas()
}
function obtenerCamposPorCodigo(codigo) {
    if (codigo === '13A') return ['nivel']
    if (codigo === '10J') return ['vinculo', 'edad', 'discapacidad']
    return ['discapacidad', 'edad', 'vinculo', 'nivel']
}
window.editarRegla = editarRegla
window.toggleRegla = toggleRegla
window.eliminarRegla = eliminarRegla
window.abrirReglaEspecial = abrirReglaEspecial
window.verDetalle = verDetalle
window.guardarRegla = guardarRegla
window.crearRegla = crearRegla

// ================================
// CERRAR PERÍODO
// ================================

async function cerrarPeriodo() {
    const filas = tabla.rows().data().toArray()
    if (filas.length === 0) return

    if (!confirm(`¿Cerrar el período de liquidación ${formatearFecha(periodosCache.desde_liq)} - ${formatearFecha(periodosCache.hasta_liq)}?\nEsto registrará ${filas.length} agentes con un snapshot de las reglas vigentes.`)) return

    const resultados = Object.values(resultadosCache)

    try {
        const btn = document.getElementById('btn-cerrar-periodo')
        btn.disabled = true
        btn.textContent = 'Guardando...'

        const response = await fetch('/api/cierres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resultados,
                desde_pres: periodosCache.desde_pres,
                hasta_pres: periodosCache.hasta_pres,
                desde_liq:  periodosCache.desde_liq
            })
        })

        let data
        try {
            data = await response.json()
        } catch {
            alert(`Error del servidor (${response.status}). El servidor puede estar actualizándose, reintentá en un momento.`)
            btn.disabled = false
            btn.textContent = 'Cerrar período'
            return
        }

        if (!response.ok) {
            alert('Error: ' + data.error)
            btn.disabled = false
            btn.textContent = 'Cerrar período'
            return
        }

        alert(`Período cerrado correctamente. Cierre #${data.cierreId}`)
        btn.textContent = 'Cerrar período'
        // El botón queda deshabilitado: el período ya fue cerrado
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message)
        document.getElementById('btn-cerrar-periodo').disabled = false
        document.getElementById('btn-cerrar-periodo').textContent = 'Cerrar período'
    }
}

// ================================
// HISTORIAL
// ================================

let tablaHistorial = null
let tablaHistResultados = null
let cierreActualId = null
let resultadosHistorialCache = {}

async function cargarHistorial() {
    const nombre     = document.getElementById('hist-nombre').value.trim()
    const periodoLiq = document.getElementById('hist-periodo-liq').value.trim()
    const estado     = document.getElementById('hist-estado').value
    const params     = new URLSearchParams()

    if (periodoLiq) params.append('periodo_liq', periodoLiq)
    if (estado)     params.append('estado', estado)

    document.getElementById('hist-detalle').style.display = 'none'

    if (nombre) {
        // Búsqueda por nombre: vista historial del empleado
        params.append('nombre', nombre)
        try {
            const response = await fetch('/api/cierres/buscar?' + params.toString())
            const data = await response.json()
            if (!response.ok) { alert('Error: ' + data.error); return }
            document.getElementById('hist-vista-cierres').style.display = 'none'
            document.getElementById('hist-vista-empleado').style.display = 'block'
            renderHistorialEmpleado(data.resultados)
        } catch (error) {
            alert('Error al buscar: ' + error.message)
        }
    } else {
        // Búsqueda por período: vista lista de cierres
        try {
            const response = await fetch('/api/cierres?' + params.toString())
            const data = await response.json()
            if (!response.ok) { alert('Error: ' + data.error); return }
            document.getElementById('hist-vista-empleado').style.display = 'none'
            document.getElementById('hist-vista-cierres').style.display = 'block'
            renderTablaHistorial(data.cierres)
        } catch (error) {
            alert('Error al cargar historial: ' + error.message)
        }
    }
}

let tablaHistEmpleado = null

function renderHistorialEmpleado(resultados) {
    resultadosHistorialCache = {}
    const filas = resultados.map(r => {
        resultadosHistorialCache[r.id] = r
        const premio  = r.detalle?.premio  ?? {}
        const alertas = r.detalle?.alertas ?? {}
        return {
            _id:             r.id,
            _nombre_raw:     r.nombre_empleado,
            _obs_raw:        r.observaciones || '',
            cuil:            r.cuil,
            nombre_empleado: r.nombre_empleado,
            periodo_liq:     r.periodo_liquidacion,
            periodo_pres:    `${formatearFecha(r.periodo_presentismo_desde)} — ${formatearFecha(r.periodo_presentismo_hasta)}`,
            dias:            r.dias_presentismo,
            porcentaje:      r.porcentaje_calculado,
            _fmt_rrhh:       fmtPesos(premio.importe_esperado),
            _fmt_sueldos:    fmtPesos(premio.importe_rrhh),
            estado:          premio.estado ?? null,
            observaciones:   r.observaciones || '',
        }
    })

    if (tablaHistEmpleado) { tablaHistEmpleado.destroy(); document.getElementById('hist-empleado-tbody').innerHTML = '' }

    tablaHistEmpleado = $('#tabla-hist-empleado').DataTable({
        data: filas,
        columns: [
            { data: 'cuil' },
            { data: 'nombre_empleado' },
            { data: 'periodo_liq' },
            { data: 'periodo_pres' },
            { data: 'dias', className: 'text-center' },
            { data: 'porcentaje', className: 'text-center', render: d => `<strong>${d}%</strong>` },
            { data: '_fmt_rrhh', type: 'num-fmt' },
            { data: '_fmt_sueldos', type: 'num-fmt' },
            {
                data: 'estado', className: 'text-center',
                render: d => {
                    if (d === 'OK')          return '<span class="badge-ok">OK</span>'
                    if (d === 'NO_COINCIDE') return '<span class="badge-revisar">Revisar</span>'
                    if (d === 'NO_EXISTE')   return '<span class="badge-noexiste">No existe</span>'
                    return ''
                }
            },
            { data: 'observaciones', render: d => d ? `<span class="text-muted small">${d}</span>` : '' },
            {
                data: null, className: 'text-center', orderable: false,
                render: (d, t, r) => `
                    <button class="btn-icon btn-icon-primary me-1" title="Ver detalle"
                        data-id="${r._id}" onclick="abrirDetalleHistorial(this)"><i class="bi bi-eye"></i></button>
                    <button class="btn-icon btn-icon-secondary" title="Observaciones"
                        data-id="${r._id}"
                        data-nombre="${r._nombre_raw.replace(/"/g, '&quot;')}"
                        data-obs="${r._obs_raw.replace(/"/g, '&quot;')}"
                        onclick="abrirModalObservaciones(this)"><i class="bi bi-pencil-square"></i></button>`
            }
        ],
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
        pageLength: 25,
        dom: '<"d-flex justify-content-between mb-2"f>rtip',
        order: [[2, 'desc']]
    })

    if (filas.length === 0) {
        document.getElementById('hist-empleado-tbody').innerHTML =
            '<tr><td colspan="11" class="text-center text-muted small">No se encontraron registros para ese nombre.</td></tr>'
    }
}

function renderTablaHistorial(cierres) {
    const tbody = document.getElementById('hist-tbody')
    tbody.innerHTML = ''

    for (const c of cierres) {
        const badgeColor = c.estado === 'editado' ? '#ffc107' : '#198754'
        const badgeText = c.estado === 'editado' ? 'Editado' : 'Exportado'
        tbody.innerHTML += `
            <tr>
                <td>${c.id}</td>
                <td>${formatearFecha(c.periodo_presentismo_desde)} — ${formatearFecha(c.periodo_presentismo_hasta)}</td>
                <td>${c.periodo_liquidacion}</td>
                <td>${formatearFechaHora(c.fecha_cierre)}</td>
                <td><span class="badge" style="background-color:${badgeColor};color:${c.estado === 'editado' ? 'black' : 'white'};font-size:0.7rem;">${badgeText}</span></td>
                <td>$${Number(c.valor_premio).toLocaleString('es-AR')}</td>
                <td>
                    <button class="btn-icon btn-icon-primary me-1" title="Ver detalle" onclick="verDetalleCierre(${c.id})"><i class="bi bi-eye"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Eliminar" onclick="eliminarCierre(${c.id}, '${c.periodo_liquidacion}')"><i class="bi bi-trash3"></i></button>
                </td>
            </tr>
        `
    }

    if (cierres.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted small">No se encontraron cierres.</td></tr>'
    }
}

async function verDetalleCierre(id) {
    try {
        const response = await fetch(`/api/cierres/${id}`)
        const data = await response.json()
        if (!response.ok) { alert('Error: ' + data.error); return }

        cierreActualId = id
        const c = data.cierre

        document.getElementById('hist-det-pres').textContent =
            `${formatearFecha(c.periodo_presentismo_desde)} — ${formatearFecha(c.periodo_presentismo_hasta)}`
        document.getElementById('hist-det-liq').textContent = c.periodo_liquidacion
        document.getElementById('hist-det-estado').innerHTML =
            c.estado === 'editado'
                ? '<span class="badge-revisar">Editado</span>'
                : '<span class="badge-ok">Exportado</span>'
        document.getElementById('hist-det-valor').textContent = fmtPesos(c.valor_premio)
        document.getElementById('hist-det-fecha').textContent = formatearFechaHora(c.fecha_cierre)
        document.getElementById('hist-det-edicion').textContent = c.fecha_ultima_edicion ? formatearFechaHora(c.fecha_ultima_edicion) : '—'
        // Renderizar tabla de reglas especiales
        const reglas = c.reglas_aplicadas?.reglas ?? []
        const especiales = reglas.filter(r => r.parametrosEspeciales?.length > 0)
        const tbody = document.getElementById('hist-reglas-tbody')
        const filas = []
        for (const r of especiales) {
            for (const bloque of r.parametrosEspeciales) {
                const cond = bloque.condiciones?.[0]
                const condTexto = cond ? `${cond.campo} ${cond.operador} ${cond.valor}` : '—'
                filas.push(`
                    <tr>
                        <td>${r.codigo}</td>
                        <td>${r.nombre}</td>
                        <td>${bloque.descripcion ?? ''}</td>
                        <td class="text-center">${bloque.tope}</td>
                        <td class="text-muted">${condTexto}</td>
                    </tr>
                `)
            }
        }
        tbody.innerHTML = filas.length ? filas.join('') : '<tr><td colspan="5" class="text-muted text-center">Sin reglas especiales</td></tr>'
        document.getElementById('hist-reglas-aplicadas').style.display = 'none'

        renderResultadosCierre(data.resultados)

        document.getElementById('hist-detalle').style.display = 'block'
        document.getElementById('hist-detalle').scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (error) {
        alert('Error: ' + error.message)
    }
}

function renderResultadosCierre(resultados) {
    resultadosHistorialCache = {}
    const filas = resultados.map(r => {
        resultadosHistorialCache[r.id] = r
        const premio  = r.detalle?.premio  ?? {}
        const alertas = r.detalle?.alertas ?? {}
        return {
            _id:              r.id,
            _nombre_raw:      r.nombre_empleado,
            _obs_raw:         r.observaciones || '',
            cuil:             r.cuil,
            nombre_empleado:  r.nombre_empleado,
            dias_presentismo: r.dias_presentismo,
            porcentaje:       r.porcentaje_calculado,
            alertas_fe:       alertas.funcion_ejecutiva,
            alertas_cmj:      alertas.cargo_mayor,
            alertas_sin:      alertas.sinAusencias,
            importe_rrhh:     premio.importe_esperado ?? null,
            importe_sueldos:  premio.importe_rrhh ?? null,
            estado:           premio.estado ?? null,
            observaciones:    r.observaciones || '',
            _fmt_rrhh:        fmtPesos(premio.importe_esperado),
            _fmt_sueldos:     fmtPesos(premio.importe_rrhh),
        }
    })

    if (tablaHistResultados) {
        tablaHistResultados.destroy()
        document.getElementById('hist-resultados-tbody').innerHTML = ''
    }

    tablaHistResultados = $('#tabla-hist-resultados').DataTable({
        data: filas,
        columns: [
            { data: 'cuil' },
            { data: 'nombre_empleado' },
            { data: 'dias_presentismo', className: 'text-center' },
            {
                data: 'porcentaje', className: 'text-center',
                render: d => `<strong>${d}%</strong>`
            },
            {
                data: null, className: 'text-center', orderable: false,
                render: (d, t, r) => {
                    let b = ''
                    if (r.alertas_fe)  b += '<span class="badge-fe">FE</span> '
                    if (r.alertas_cmj) b += '<span class="badge-cmj">CMJ</span> '
                    if (r.alertas_sin) b += '<span class="badge-sinausencias">S/Ausencias</span>'
                    return b || ''
                }
            },
            { data: '_fmt_rrhh',     orderData: [5], type: 'num-fmt' },
            { data: '_fmt_sueldos',  orderData: [6], type: 'num-fmt' },
            {
                data: 'estado', className: 'text-center',
                render: d => {
                    if (d === 'OK')          return '<span class="badge-ok">OK</span>'
                    if (d === 'NO_COINCIDE') return '<span class="badge-revisar">Revisar</span>'
                    if (d === 'NO_EXISTE')   return '<span class="badge-noexiste">No existe</span>'
                    return ''
                }
            },
            {
                data: 'observaciones',
                render: d => d ? `<span class="text-muted small">${d}</span>` : ''
            },
            {
                data: null, className: 'text-center', orderable: false,
                render: (d, t, r) => `
                    <button class="btn-icon btn-icon-primary me-1" title="Ver detalle"
                        data-id="${r._id}" onclick="abrirDetalleHistorial(this)"><i class="bi bi-eye"></i></button>
                    <button class="btn-icon btn-icon-secondary" title="Observaciones"
                        data-id="${r._id}"
                        data-nombre="${r._nombre_raw.replace(/"/g, '&quot;')}"
                        data-obs="${r._obs_raw.replace(/"/g, '&quot;')}"
                        onclick="abrirModalObservaciones(this)"><i class="bi bi-pencil-square"></i></button>`
            }
        ],
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
        pageLength: 25,
        dom: '<"d-flex justify-content-between mb-2"f>rtip',
        order: [[1, 'asc']]
    })
}

window.abrirDetalleHistorial = function(btn) {
    const r = resultadosHistorialCache[btn.dataset.id]
    if (!r) return

    const resultado = r.detalle?.resultado ?? {}

    document.getElementById('mdet-nombre').textContent    = r.nombre_empleado
    document.getElementById('mdet-cuil').textContent      = r.cuil
    document.getElementById('mdet-dias').textContent      = resultado.total_descontables ?? 0
    document.getElementById('mdet-porcentaje').textContent = (resultado.porcentaje ?? 0) + '%'
    document.getElementById('mdet-total').textContent     = resultado.total_descontables ?? 0

    // Detalle de ausencias
    document.getElementById('mdet-detalle').innerHTML = (resultado.detalle ?? []).map(d => `
        <tr>
            <td>${d.codigo}</td>
            <td>${d.nombre}</td>
            <td><small class="text-muted">${d.explicacion_tope ?? 'Tope general'}</small></td>
            <td class="text-center">${d.historicos}</td>
            <td class="text-center">${d.dias}</td>
            <td class="text-center">${d.tope}</td>
            <td class="text-center"><strong>${d.descontables}</strong></td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="text-muted text-center">Sin detalle</td></tr>'

    // Ausencias del período
    document.getElementById('mdet-ausencias-periodo').innerHTML = (resultado.ausenciasPeriodo ?? []).map(a => `
        <tr>
            <td>${a.codigo}</td>
            <td>${a.nivel && a.nivel !== 'null' ? a.nivel : ''}</td>
            <td>${a.vinculo && a.vinculo !== 'null' ? a.vinculo : ''}</td>
            <td>${formatearFecha(a.fechaDesde)}</td>
            <td>${formatearFecha(a.fechaHasta)}</td>
            <td class="text-center">${a.dias}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="text-muted text-center">Sin ausencias</td></tr>'

    // Ausencias históricas
    document.getElementById('mdet-ausencias-historicas').innerHTML = (resultado.ausenciasHistoricas ?? []).map(a => `
        <tr>
            <td>${a.codigo}</td>
            <td>${a.nivel && a.nivel !== 'null' ? a.nivel : ''}</td>
            <td>${a.vinculo && a.vinculo !== 'null' ? a.vinculo : ''}</td>
            <td>${formatearFecha(a.fechaDesde)}</td>
            <td>${formatearFecha(a.fechaHasta)}</td>
            <td class="text-center">${a.dias}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" class="text-muted text-center">Sin ausencias anteriores</td></tr>'

    new bootstrap.Modal(document.getElementById('modalDetalleHistorial')).show()
}

function toggleReglasAplicadas() {
    const el = document.getElementById('hist-reglas-aplicadas')
    el.style.display = el.style.display === 'none' ? 'block' : 'none'
}

window.abrirModalObservaciones = function(btn) {
    document.getElementById('obs-resultado-id').value = btn.dataset.id
    document.getElementById('obs-cierre-id').value = cierreActualId
    document.getElementById('obs-nombre-empleado').textContent = btn.dataset.nombre
    document.getElementById('obs-texto').value = btn.dataset.obs || ''
    new bootstrap.Modal(document.getElementById('modalObservaciones')).show()
}

async function guardarObservaciones() {
    const resultadoId = document.getElementById('obs-resultado-id').value
    const cierreId = document.getElementById('obs-cierre-id').value
    const observaciones = document.getElementById('obs-texto').value.trim()

    const response = await fetch(`/api/cierres/${cierreId}/resultados/${resultadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: observaciones || null })
    })

    const data = await response.json()
    if (!response.ok) { alert('Error: ' + data.error); return }

    bootstrap.Modal.getInstance(document.getElementById('modalObservaciones')).hide()
    verDetalleCierre(parseInt(cierreId))
}

function formatearFechaHora(str) {
    if (!str) return '—'
    const d = new Date(str)
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

window.eliminarCierre = async function(id, periodoLiq) {
    if (!confirm(`¿Estás seguro que querés eliminar el cierre del período ${periodoLiq}?\nEsta acción eliminará la cabecera y todos los resultados asociados. No se puede deshacer.`)) return

    try {
        const response = await fetch(`/api/cierres/${id}`, { method: 'DELETE' })
        const data = await response.json()
        if (!response.ok) { alert('Error: ' + data.error); return }
        document.getElementById('hist-detalle').style.display = 'none'
        cargarHistorial()
    } catch (error) {
        alert('Error al conectar con el servidor: ' + error.message)
    }
}

window.verDetalleCierre = verDetalleCierre
window.abrirModalObservaciones = abrirModalObservaciones
window.cerrarPeriodo = cerrarPeriodo

// ================================
// AUTH
// ================================
async function iniciarSesion() {
    const usuario = document.getElementById('login-usuario').value.trim()
    const password = document.getElementById('login-password').value.trim()
    const errorDiv = document.getElementById('login-error')

    if (!usuario || !password) {
        errorDiv.textContent = 'Ingresá usuario y contraseña.'
        errorDiv.classList.remove('d-none')
        return
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        })

        const data = await response.json()

        if (!response.ok) {
            errorDiv.textContent = data.error
            errorDiv.classList.remove('d-none')
            return
        }

        // Login exitoso - ocultar pantalla de login
        document.getElementById('pantalla-login').style.display = 'none'
        errorDiv.classList.add('d-none')

    } catch (error) {
        errorDiv.textContent = 'Error al conectar con el servidor.'
        errorDiv.classList.remove('d-none')
    }
}

async function cerrarSesion() {
    await fetch('/api/auth/logout', { method: 'POST' })
    document.getElementById('pantalla-login').style.display = 'flex'
}