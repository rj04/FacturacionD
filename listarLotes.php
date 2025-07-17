<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

include_once "helpers.php";
// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('view_print_batches')) {
    header("Location: index.php?error=Acceso denegado a lotes de impresión.");
    exit;
}

include_once "header.php";
include_once "navbar.php";
?>
<style>
    #lotesTable {
        width: 100% !important;
        font-size: 0.85rem;
    }
    #lotesTable td, #lotesTable th {
        vertical-align: middle;
    }
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
                    <h1 class="m-0" style="font-size:20px">Lotes de Impresión Registrados</h1>
                </div>
            </div>
        </div>
    </div>

    <!-- Main content -->
    <section class="content">
        <div class="container-fluid">
            <div class="card">
                <div class="card-body">
                    <!-- Puedes añadir un formulario de búsqueda aquí si lo necesitas -->
                    <table id="lotesTable" class="table table-bordered table-striped dt-responsive" width="100%">
                        <thead>
                            <tr>
                                <th class="text-center">N° Lote</th>
                                <th class="text-center">Fecha Lote</th>
                                <th class="text-center">Correlativo Día</th>
                                <th class="text-center">Usuario Registro</th>
                                <th class="text-center">Fecha Registro</th>
                                <th class="text-center">OCAs en Lote</th>
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

<script>
    $(document).ready(function() {
        var table = $('#lotesTable').DataTable({
            "processing": true,
            "serverSide": true,
            "ajax": {
                "url": "listarLotes_dt.php",
                "type": "GET"
                // "data": function ( d ) {
                //     d.customSearch = $('#searchLoteInput').val(); // Si añades búsqueda
                // }
            },
            "columns": [
                { "data": "numeroLote", "className": "text-center" },
                { "data": "fechaLoteFormateada", "className": "text-center" },
                { "data": "correlativoDia", "className": "text-center" },
                { "data": "usuario_nombre", "className": "text-left" },
                { "data": "fechaRegistroFormateada", "className": "text-center" },
                { "data": "cantidad_ocas", "className": "text-center", "orderable": false, "searchable": false },
                {
                    "data": "idLote",
                    "orderable": false,
                    "searchable": false,
                    "className": "text-center",
                    "render": function(data, type, row) {
                        let btnMarcarNoImpreso = `<button class="btn btn-warning btn-sm" onclick="marcarLoteComoNoImpreso(${data})" title="Marcar todas las OCAs de este lote como NO IMPRESAS">
                                                    <i class="bi bi-arrow-counterclockwise"></i> Marcar No Impreso</button>`;
                        return btnMarcarNoImpreso;
                    }
                }
            ],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
                 "processing": '<i class="fas fa-spinner fa-spin fa-2x"></i> Procesando...',
                 "emptyTable": "No hay lotes de impresión registrados.",
                 "zeroRecords": "No se encontraron lotes de impresión."
            },
            "responsive": true,
            "autoWidth": false,
            "searching": true, // Habilitar búsqueda global de DataTables para lotes
            "pageLength": 10,
            "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
            "order": [[4, 'desc']] // Ordenar por Fecha de Registro descendente por defecto
        });

        // --- Recalcular Responsive en eventos de AdminLTE/Resize ---
        $(document).on('collapsed.lte.pushmenu shown.lte.pushmenu', function() {
            setTimeout(function() { if (table) table.responsive.recalc(); }, 350);
        });
        $(window).on('resize', function () {
            if (table) table.responsive.recalc();
        });
    });

    function marcarLoteComoNoImpreso(idLote) {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Todas las OCAs en este lote se marcarán como 'Nuevas (No Impresas)'. Esta acción se registrará.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, marcar como No Impreso',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const formData = new FormData();
                formData.append('idLote', idLote);

                fetch('marcarLoteNoImpreso.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('¡Actualizado!', data.message, 'success');
                        // Opcional: Recargar la tabla de lotes si quieres reflejar algún cambio aquí,
                        // aunque el cambio principal se verá en la tabla de OCAs.
                        // $('#lotesTable').DataTable().ajax.reload(null, false);
                    } else {
                        Swal.fire('Error', data.message || 'No se pudo actualizar el lote.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error en fetch:', error);
                    Swal.fire('Error', 'Ocurrió un error de comunicación.', 'error');
                });
            }
        });
    }

    // Si necesitas una función para ver las OCAs del lote en el futuro:
    // function verOcasDelLote(idLote) { /* ... tu lógica ... */ }
</script>