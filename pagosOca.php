<?php
// pagosOca.php
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
</style>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0" style="font-size:20px">Órdenes de Compra - Pagos</h1>
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
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <label for="searchOcaInput">Buscar por OCA:</label>
                            <div class="input-group">
                                <input type="text" id="searchOcaInput" placeholder="Ingrese OCA..." class="form-control">
                                <div class="input-group-append">
                                    <button id="searchOcaBtn" class="btn btn-primary" type="button">
                                        <i class="fas fa-search"></i> Buscar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-8 text-md-right mt-2 mt-md-0">
                             <a href='ingresarOca.php' class='btn btn-success'>
                                <i class="fas fa-plus mr-1"></i> Registrar Nueva OCA
                             </a>
                        </div>
                    </div>

                    <!-- Tabla para DataTables -->
                    <table id="ocasTable" class="table table-bordered table-striped dt-responsive nowrap" width="100%">
                        <thead>
                            <tr>
                                <th class="text-center">Proyecto</th>
                                <th class="text-center">Orden de Compra</th>
                                <th class="text-center">Monto Total</th>
                                <th class="text-center">Monto Pagado</th>
                                <th class="text-center">Acciones</th>
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
        // Función para formatear moneda
        function formatCurrency(number) {
            return '$' + parseFloat(number).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }

        var table = $('#ocasTable').DataTable({
            "processing": true,
            "serverSide": true,
            "ajax": {
                "url": "pagosOca_dt.php", // Apunta al nuevo backend
                "type": "GET",
                "data": function ( d ) {
                    // Añadir el valor del input de búsqueda a la petición AJAX
                    d.searchOca = $('#searchOcaInput').val();
                }
            },
            "dom": '<"row"<"col-sm-12 col-md-6"><"col-sm-12 col-md-6">><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"><"col-sm-12 col-md-7"p>>',
            
            "columns": [
                { "data": "proyectoDesc", "className": "text-left" }, // Concatenado en backend
                { "data": "oca", "className": "text-center" },
                {
                    "data": "montoTotal",
                    "className": "text-right",
                    "render": function(data, type, row) {
                        return formatCurrency(data); // Formatear como moneda
                    }
                },
                {
                    "data": "montoPagado",
                    "className": "text-right",
                    "render": function(data, type, row) {
                        return formatCurrency(data); // Formatear como moneda
                    }
                },
                {
                    "data": "idOca", // Usar el ID para generar el botón
                    "orderable": false,
                    "searchable": false,
                    "className": "text-center",
                    "render": function(data, type, row) {
                        // Botón "Registrar Pago" (existente)
                        let registrarUrl = `registrarPago.php?idOca=${data}`;
                        let btnRegistrar = `<a href='${registrarUrl}' class='btn btn-info btn-sm mr-1'>
                                    <i class="fas fa-dollar-sign mr-1"></i> Registrar Pago
                                </a>`;
                        // *** NUEVO: Botón/Link "Ver Detalles" ***
                        let detalleUrl = `detallePagosOca.php?idOca=${data}`;
                        let btnDetalle = `<a href='${detalleUrl}' class='btn btn-secondary btn-sm'>
                                    <i class="fas fa-eye mr-1"></i> Ver Detalles
                                </a>`;
                        // *** CORRECCIÓN: Devolver el HTML de los botones ***
                        return btnRegistrar + btnDetalle;
                    }
                }
            ],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
                 "processing": '<i class="fas fa-spinner fa-spin fa-2x"></i> Procesando...', // Icono de carga
                 "emptyTable": "No hay órdenes de compra disponibles",
                 "zeroRecords": "No se encontraron órdenes de compra coincidentes"
            },
            "responsive": true, // Habilitar responsividad
            "autoWidth": false,
            "searching": false, // Deshabilitar búsqueda global de DataTables (usamos la personalizada)
            "pageLength": 10,
            "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
            "order": [[1, 'asc']], // Ordenar por OCA por defecto
            "drawCallback": function( settings ) {
                // Opcional: Código a ejecutar después de cada redibujado
                // console.log( 'Tabla redibujada' );
                // Verificar si no hay resultados filtrados y mostrar mensaje (opcional)
                // var api = this.api();
                // if (api.page.info().recordsDisplay === 0 && $('#searchOcaInput').val() !== '') {
                //     // Podrías mostrar un mensaje aquí si lo deseas
                // }
            }
        });

        // --- Evento para el botón de búsqueda personalizado ---
        $('#searchOcaBtn').on('click', function() {
            table.ajax.reload(); // Recargar la tabla con el nuevo filtro
        });

        // --- Evento para buscar al presionar Enter en el input ---
        $('#searchOcaInput').on('keypress', function(e) {
            if (e.which === 13) { // Código 13 es Enter
                table.ajax.reload();
            }
        });

        // --- Recalcular Responsive en eventos de AdminLTE/Resize ---
        $(document).on('collapsed.lte.pushmenu shown.lte.pushmenu', function() {
            setTimeout(function() { if (table) table.responsive.recalc(); }, 350);
        });
        $(window).on('resize', function () {
            if (table) table.responsive.recalc();
        });

    }); // Fin $(document).ready
</script>
