<?php
// listarOcas.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// No necesitamos la conexión ni la lógica de búsqueda aquí
// $mysqli = include_once "conexion.php";

include_once "header.php";
include_once "navbar.php";
?>
<style>
    /* Ajustes opcionales para DataTables */
    #ocasTable {
        width: 100% !important;
        font-size: 0.85rem; /* Ajustar tamaño de fuente si es necesario */
    }
    #ocasTable td, #ocasTable th {
        vertical-align: middle;
    }
    /* Estilos para el overlay de procesamiento */
    .dataTables_wrapper .dataTables_processing {
        position: absolute; top: 50%; left: 50%; width: 200px; margin-left: -100px; margin-top: -26px; text-align: center; padding: 1em 0; background-color: white; border: 1px solid #ccc; box-shadow: 0 0 5px #ccc; z-index: 1000;
    }
    /* Estilos para botones de acción */
    #ocasTable .action-buttons {
        white-space: nowrap; /* Evitar que los botones se partan */
    }
    .no-wrap-cell {
        white-space: nowrap !important; /* Forzar a no dividir el contenido de la celda */
    }
</style>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0" style="font-size:20px">Órdenes de Compra Registradas</h1>
                </div><!-- /.col -->
                 <div class="col-sm-6">
    
                </div><!-- /.col -->
            </div><!-- /.row -->
        </div><!-- /.container-fluid -->
    </div><!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
        <div class="container-fluid">
            <div class="card">

                <div class="card-body">
                    <!-- Formulario de Búsqueda Simplificado -->
                    <div class="row mb-3 align-items-end">
                        <div class="col-md-5">
                            <label for="searchOcaInput">Buscar (Proyecto, OCA, Proveedor, etc.):</label>
                            <div class="input-group">
                                <input type="text" id="searchOcaInput" placeholder="Ingrese término de búsqueda..." class="form-control">
                                <div class="input-group-append">
                                    <button id="searchOcaBtn" class="btn btn-primary" type="button">
                                        <i class="fas fa-search"></i> Buscar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-auto ml-md-auto mt-3 mt-md-0"> <!-- Botones de acción para seleccionadas -->
                            <div class="btn-group" role="group" aria-label="Acciones para seleccionadas">
                                <button id="imprimirSeleccionadasBtn" class="btn btn-primary">
                                    <i class="bi bi-printer"></i> Imprimir Seleccionadas
                                </button>
                                <button id="marcarSeleccionadasBtn" class="btn btn-info">
                                    <i class="bi bi-check-all"></i> Marcar Seleccionadas
                                </button>
                            </div>
                        </div>
                        <div class="col-md-3 mt-3 mt-md-0">
                            <label for="filtroImpresas" class="mb-0">Mostrar OCAs:</label>
                            <select id="filtroImpresas" class="form-control">
                                <option value="no_impresas" selected>Nuevas (No Impresas)</option>
                                <option value="solo_impresas">Ya Impresas</option>
                                <option value="todas">Todas</option>
                            </select>
                        </div>
                         <div class="col-md-auto text-md-right mt-3 mt-md-0">
                             <a href='ingresarOca.php' class='btn btn-success'>
                                <i class="fas fa-plus mr-1"></i> Registrar Nueva OCA
                             </a>
                        </div>
                    </div>

                    <!-- Tabla para DataTables -->
                    <table id="ocasTable" class="table table-bordered table-striped dt-responsive" width="100%">
                        <thead>
                            <tr>
                                <th class="text-center"></th> <!-- Para el checkbox -->
                                <th class="text-center">Proyecto</th>
                                <th class="text-center">OCA Completa</th> <!-- Encabezado modificado -->
                                <th class="text-center">Proceso DOM</th>
                                <th class="text-center">Proveedor</th>
                                <th class="text-center">Valor OCA</th>
                                <th class="text-center">N° Factura</th>
                                <th class="text-center">Total Factura</th>
                                <th class="text-center">Fecha Compras</th> <!-- Nuevo Encabezado -->
                                <th class="text-center">Estado Impresión</th>
                                <th class="text-center">Acciones</th> <!-- Columna 10 -->
                            </tr>
                        </thead>
                        <tbody>
                            <!-- DataTables llenará esta sección vía AJAX -->
                        </tbody>
                    </table>
                </div><!-- /.card-body -->
            </div><!-- /.card -->
        </div><!-- /.container-fluid -->
    </section>
    <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<?php include_once "footer.php"; ?>

<!-- Script para DataTables -->
<script>
    $(document).ready(function() {
        var table = $('#ocasTable').DataTable({
            "processing": true,
            "serverSide": true,
            "ajax": {
                "url": "listarOcas_dt.php", // Apunta al nuevo backend
                "type": "GET",
                "data": function ( d ) {
                    // Añadir el valor del input de búsqueda a la petición AJAX
                    d.searchOca = $('#searchOcaInput').val();
                    d.filtro_impresas = $('#filtroImpresas').val(); // Nuevo filtro
                }
            },
            // --- MODIFICACIÓN: Añadir 'B' para botones ---
            "dom": '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' + // lengthMenu y filtro global (si lo quieres)
                   '<"row"<"col-sm-12"B>>' + // Contenedor para los botones
                   '<"row"<"col-sm-12"tr>>' + // La tabla en sí
                   '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>', // Paginación e información
            "buttons": [
                {
                    extend: 'excelHtml5',
                    text: '<i class="fas fa-file-excel"></i> Exportar a Excel',
                    titleAttr: 'Exportar a Excel',
                    className: 'btn btn-success btn-sm mb-2'
                },
                // Puedes añadir más botones como 'csv', 'pdf', 'print'
            ],
            "columns": [
                {
                    "data": null,
                    "orderable": false,
                    "searchable": false,
                    "className": "text-center dt-body-center",
                    "render": function (data, type, row) {
                        return '<input type="checkbox" class="oca-checkbox" value="' + row.idOca + '">';
                    },
                    "title": '<input type="checkbox" id="select-all-ocas">' // Checkbox en el encabezado
                },
                { "data": "proyectoDesc", "className": "text-left" }, // Col 1: Proyecto
                { "data": "oca_completa", "className": "text-center" }, // Col 2: OCA Completa (ahora índice 2)
                { "data": "proceso_dom", "className": "text-left" }, // Col 3: Proceso DOM (ahora índice 3)
                { "data": "proveedor_nombre", "className": "text-left" }, // Col 4: Proveedor (ahora índice 4)
                { "data": "valor_oca", "className": "text-right no-wrap-cell", "render": $.fn.dataTable.render.number(',', '.', 2, '$') }, // Col 5: Valor OCA (ahora índice 5)
                { "data": "numero_factura", "className": "text-center no-wrap-cell" }, // Col 6: N° Factura (ahora índice 6)
                { "data": "total_factura", "className": "text-right no-wrap-cell", "render": $.fn.dataTable.render.number(',', '.', 2, '$') }, // Col 7: Total Factura (ahora índice 7)
                { "data": "fecha_compras_formateada", "className": "text-center" }, // Col 8: Fecha Compras (ahora índice 8)
                { // Col 9: Estado Impresión
                    "data": "impresa",
                    "className": "text-center",
                    "render": function(data, type, row) {
                        return data == 1 ? '<span class="badge badge-success">Impresa</span>' : '<span class="badge badge-info">Nueva</span>'; // Cambiado a badge-info
                    }
                },
                {
                    "data": "idOca", // Usar el ID para generar botones
                    "orderable": false,
                    "searchable": false, // Col 10: Acciones
                    "className": "text-center action-buttons", // Clase para botones
                    "render": function(data, type, row) {
                        // Botón "Editar"
                        let editUrl = `editarOcas.php?idOca=${data}`; 
                        let btnEditar = `<a href='${editUrl}' class='btn btn-secondary btn-sm mr-1' title='Editar'>
                                    <i class='bi bi-pencil'></i>
                                    </a>`;

                        // Botón "Imprimir"
                        // Abre imprimirOca.php en una nueva ventana/tab
                        let printUrl = `imprimirOca.php?idOca=${data}`;
                        let btnImprimir = `<a href='${printUrl}' target='_blank' class='btn btn-primary btn-sm mr-1' title='Imprimir'>
                                        <i class='bi bi-printer'></i>
                                    </a>`;

                        let btnMarcar;
                        if (row.impresa == 0) { // Si no está impresa (es nueva)
                            btnMarcar = `<button class='btn btn-info btn-sm mr-1' title='Marcar como Impresa' onclick='actualizarEstadoImpresion(${data}, 1)'>
                                            <i class='bi bi-check-circle'></i>
                                         </button>`; // <-- CORRECCIÓN: Añadido </button>
                        } else { // Si ya está impresa
                            btnMarcar = `<button class='btn btn-warning btn-sm mr-1' title='Marcar como Nueva (No Impresa)' onclick='actualizarEstadoImpresion(${data}, 0)'>
                                            <i class='bi bi-arrow-counterclockwise'></i>
                                         </button>`;
                        }
                        return btnEditar + btnImprimir + btnMarcar; // <-- CORRECCIÓN: Añadido btnImprimir
                    }
                } // Fin Columna Acciones
            ],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
                 "processing": '<i class="fas fa-spinner fa-spin fa-2x"></i> Procesando...',
                 "emptyTable": "No hay órdenes de compra disponibles",
                 "zeroRecords": "No se encontraron órdenes de compra coincidentes"
            },
            "responsive": true,
            "autoWidth": false,
            "searching": false, // Deshabilitar búsqueda global de DataTables
            "pageLength": 10,
            "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
            "order": [[1, 'asc'], [2, 'asc']], // Ordenar por Proyecto (índice 1) y luego por OCA Completa (índice 2)
            "drawCallback": function( settings ) {
                // Código a ejecutar después de cada redibujado
                var api = this.api();
                // Forzar ajuste de columnas y recálculo de responsividad
                // Esto es útil si el layout cambia (ej. sidebar de AdminLTE)
                api.columns.adjust().responsive.recalc();
            },
            "initComplete": function(settings, json) {
                // Forzar un reajuste después de que la tabla esté completamente inicializada
                // y los datos cargados por primera vez.
                var api = this.api();
                setTimeout(function(){ api.columns.adjust().responsive.recalc(); }, 150);
            }
        }); // Fin DataTable initialization

        $('#marcarSeleccionadasBtn').on('click', function() {
    const seleccionadasIds = [];
    $('.oca-checkbox:checked', table.rows({ 'search': 'applied' }).nodes()).each(function() {
        seleccionadasIds.push($(this).val());
    });

    if (seleccionadasIds.length === 0) {
        Swal.fire('Atención', 'No ha seleccionado ninguna OCA para marcar.', 'info');
        return;
    }

    Swal.fire({
        title: '¿Marcar OCAs?',
        text: `Se marcarán ${seleccionadasIds.length} OCA(s) como "Impresas". ¿Continuar?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, marcar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Aquí podrías llamar a un nuevo script PHP para el lote
            // o iterar y llamar a `actualizarEstadoImpresion` para cada una.
            // Llamar a un script de lote es más eficiente.
            procesarMarcadoEnLote(seleccionadasIds);
        }
    });
});

        $('#imprimirSeleccionadasBtn').on('click', function() {
            const seleccionadasIds = [];
            // Obtener solo los checkboxes visibles y marcados dentro de la tabla
            $('.oca-checkbox:checked', table.rows({ 'search': 'applied' }).nodes()).each(function() {
                seleccionadasIds.push($(this).val());
            });

            if (seleccionadasIds.length === 0) {
                Swal.fire('Atención', 'No ha seleccionado ninguna OCA para imprimir.', 'info');
                return;
            }

            // Construir la URL con los IDs de las OCAs
            let printUrl = 'imprimirMultiplesOcas.php';
            const params = new URLSearchParams();
            seleccionadasIds.forEach(id => {
                params.append('idOcas[]', id);
            });
            printUrl += '?' + params.toString();

            // Abrir en una nueva pestaña
            window.open(printUrl, '_blank');
});

        $('#imprimirSeleccionadasBtn').on('click', function() {
            const seleccionadasIds = [];
            // Obtener solo los checkboxes visibles y marcados dentro de la tabla
            $('.oca-checkbox:checked', table.rows({ 'search': 'applied' }).nodes()).each(function() {
                seleccionadasIds.push($(this).val());
            });

            if (seleccionadasIds.length === 0) {
                Swal.fire('Atención', 'No ha seleccionado ninguna OCA para imprimir.', 'info');
                return;
            }

            // Construir la URL para la vista de impresión
            let printUrl = 'imprimirMultiplesOcas.php';
            const params = new URLSearchParams();
            seleccionadasIds.forEach(id => {
                params.append('idOcas[]', id);
            });
            printUrl += '?' + params.toString();

            // Abrir en una nueva pestaña
            window.open(printUrl, '_blank');

            // *** NUEVO: Llamar al script para crear el lote después de abrir la ventana ***
            crearLoteImpresion(seleccionadasIds);
        });

function procesarMarcadoEnLote(idsOca) { // Esta función ya existía para marcar
    const formData = new FormData();
    idsOca.forEach(id => formData.append('idOcas[]', id)); // Enviar como array
    formData.append('nuevo_estado', 1); // Marcar como impresas

    fetch('marcarMultiplesOcasImpresas.php', { // NUEVO SCRIPT PHP
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Swal.fire('¡Actualizado!', data.message || 'Las OCAs seleccionadas han sido marcadas.', 'success');
            $('#select-all-ocas').prop('checked', false); // Desmarcar el "seleccionar todo"
            $('#ocasTable').DataTable().ajax.reload(null, false);
        } else {
            Swal.fire('Error', data.message || 'No se pudieron marcar todas las OCAs.', 'error');
        }
    })
    .catch(error => {
        console.error('Error en fetch (lote):', error);
        Swal.fire('Error', 'Ocurrió un error de comunicación al marcar en lote.', 'error');
    });
}

// *** NUEVA FUNCIÓN: Crear Lote de Impresión ***
function crearLoteImpresion(idsOca) {
    const formData = new FormData();
    idsOca.forEach(id => formData.append('idOcas[]', id)); // Enviar IDs de OCA

    fetch('crearLoteImpresion.php', { // Apunta al nuevo script
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Opcional: Mostrar un mensaje con el número de lote creado
            // console.log('Lote de impresión creado:', data.numeroLote);
            // Swal.fire('Lote Creado', `Se ha creado el lote de impresión: <strong>${data.numeroLote}</strong>`, 'success');
            $('#select-all-ocas').prop('checked', false); // Desmarcar el "seleccionar todo"
            $('#ocasTable').DataTable().ajax.reload(null, false); // Recargar la tabla para reflejar cambios
        } else {
            console.error('Error al crear lote de impresión:', data.message);
            // Opcional: Mostrar un error si falla la creación del lote
            // Swal.fire('Error', data.message || 'No se pudo crear el lote de impresión.', 'error');
        }
    })
    .catch(error => {
        console.error('Error en fetch (crear lote):', error);
        Swal.fire('Error', 'Ocurrió un error de comunicación al marcar en lote.', 'error');
    });
}

        // --- Evento para el botón de búsqueda y filtro de impresión ---
        $('#searchOcaBtn').on('click', function() {
            table.ajax.reload(); // Recargar la tabla con el nuevo filtro
        });
        $('#searchOcaInput').on('keypress', function(e) {
            if (e.which === 13) { // Código 13 es Enter
                table.ajax.reload();
            }
        });
        $('#filtroImpresas').on('change', function() {
            table.ajax.reload();
        }); // Se elimina el cierre extra de '}' y ');' que estaban en las líneas siguientes

        // --- Recalcular Responsive en eventos de AdminLTE/Resize ---
        $(document).on('collapsed.lte.pushmenu shown.lte.pushmenu', function() {
            setTimeout(function() { if (table) table.responsive.recalc(); }, 350);
        });
        $(window).on('resize', function () {
            if (table) table.responsive.recalc();
        });

        $('#select-all-ocas').on('click', function(){
                var rows = table.rows({ 'search': 'applied' }).nodes();
                $('input[type="checkbox"]', rows).prop('checked', this.checked);
            });

            $('#ocasTable tbody').on('change', 'input[type="checkbox"]', function(){
                if(!this.checked){
                    var el = $('#select-all-ocas').get(0);
                    if(el && el.checked && ('indeterminate' in el)){
                        el.indeterminate = true;
                    }
                }
            });

    }); // Fin $(document).ready

    // --- Función para Actualizar Estado de Impresión ---
    function actualizarEstadoImpresion(idOca, nuevoEstado) {
        const textoAccion = nuevoEstado === 1 ? "impresa" : "nueva (no impresa)";
        const textoConfirmacion = nuevoEstado === 1 ? "Marcar como Impresa" : "Marcar como Nueva";

        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se marcará la OCA como ${textoAccion}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: `Sí, ${textoConfirmacion}`,
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const formData = new FormData();
                formData.append('idOca', idOca);
                formData.append('nuevo_estado', nuevoEstado);

                fetch('actualizarEstadoImpresionOca.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json()) // Asumiendo que devuelve JSON
                .then(data => {
                    if (data.success) {
                        Swal.fire('¡Actualizado!', data.message || 'El estado de la OCA ha sido actualizado.', 'success');
                        $('#ocasTable').DataTable().ajax.reload(null, false); // Recargar tabla
                    } else {
                        Swal.fire('Error', data.message || 'No se pudo actualizar el estado.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error en fetch:', error);
                    Swal.fire('Error', 'Ocurrió un error de comunicación.', 'error');
                });
            }
        });
    }
</script>