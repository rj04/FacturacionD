<?php
// Asegúrate de que la sesión esté iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

include_once "helpers.php"; // Para la función usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_projects')) { // Permiso para ver/gestionar proyectos
    header("Location: index.php?error=Acceso denegado a la lista de proyectos.");
    exit;
}
// --- Fin Control de Acceso ---

include_once "header.php";
$mysqli = include_once "conexion.php";
$initialTotalRecords = 0;
$sqlTotal = "SELECT COUNT(idProyecto) as total FROM proyectos WHERE nombreProyecto <> ''";
$resultTotal = $mysqli->query($sqlTotal);
if ($resultTotal) {
    $initialTotalRecords = $resultTotal->fetch_assoc()['total'];
    $resultTotal->free();
}
$mysqli->close();
include_once "navbar.php";
?>
<!-- Añadir estilos si no están globales -->
<style>
    #proyectosTable {
        width: 100% !important; /* Forzar ancho */
        font-size: 0.7rem !important;
    }

    /* --- CSS MÁS ESPECÍFICO PARA DATATABLES CON SCROLLX --- */

    /* Estilo para los ENCABEZADOS (th) dentro del contenedor de scroll */
    .dataTables_scrollHead table#proyectosTable.dataTable thead th {
        font-size: 0.7rem !important; /* Tamaño deseado, !important para asegurar */
        text-align: center !important; /* Centrado, !important */
        vertical-align: middle !important; /* Alineación vertical, !important */
        white-space: nowrap; /* Evitar que el texto del encabezado se parta */
        /* Puedes añadir aquí otros estilos específicos del encabezado si los necesitas */
    }

    /* Estilo para las CELDAS DEL CUERPO (td) dentro del contenedor de scroll */
    .dataTables_scrollBody table#proyectosTable.dataTable tbody td {
        font-size: 0.7rem !important; /* Tamaño deseado consistente, !important */
        vertical-align: middle !important; /* Alineación vertical, !important */
        /* La alineación horizontal por defecto suele ser izquierda, ajústala si es necesario */
        /* text-align: center; */ /* Descomenta si quieres centrar también el cuerpo */
    }

    /* --- FIN CSS MÁS ESPECÍFICO --- */


    /* Estilos específicos para alinear columnas del cuerpo si es necesario */
     .dataTables_scrollBody table#proyectosTable.dataTable tbody td:nth-child(3) { /* Nombre Proyecto */
        text-align: left !important; /* Alinear a la izquierda */
     }
     /* Añade más selectores td:nth-child(n) si necesitas alinear otras columnas */


    .dataTables_wrapper .dataTables_processing {
        /* ... (estilos de processing sin cambios) ... */
        position: absolute; 
        top: 50%; 
        left: 50%; 
        width: 200px; 
        margin-left: -100px; 
        margin-top: -26px; 
        text-align: center; 
        padding: 1em 0; 
        background-color: white; 
        border: 1px solid #ccc; 
        box-shadow: 0 0 5px #ccc; 
        z-index: 1000;
    }
    .btn-sm {
        /* ... (estilos btn-sm sin cambios) ... */
        padding: 0.2rem 0.4rem; font-size: 0.75rem;
    }
    #proyectosTable .action-buttons { /* Este selector puede necesitar ajuste también */
        white-space: nowrap;
        text-align: center;
    }
    /* Ajuste para botones de acción si también usan el selector más específico */
    .dataTables_scrollBody table#proyectosTable.dataTable tbody td.action-buttons {
         white-space: nowrap;
         text-align: center !important; /* Centrado forzado */
    }


    /* --- CSS Buscador (Sin cambios) --- */
    .dataTables_wrapper .row:first-child .col-md-6:first-child {
        padding-left: 0;
    }
    .dataTables_filter {
        text-align: left !important;
    }
    .dataTables_filter label {
        display: inline-flex;
        align-items: center;
        width: auto;
        margin-bottom: 0.5rem;
    }
    .dataTables_filter input {
        width: auto;
        max-width: 250px;
        margin-left: 0.5em !important;
        display: inline-block;
    }

</style>

<div class="content-wrapper">
    <div class="container-fluid">
        <div class="content-header">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0" style="font-size:20px">Lista de Proyectos Registrados</h1>
                </div>
                <div class="col-sm-6 text-sm-right mt-2 mt-sm-0">
                    <a href="agregarProyecto.php" class="btn btn-primary">Agregar Nuevo Proyecto</a>
                </div>
            </div>
        </div>

        <section class="content">
            <div class="row">
                <div class="col-12">
                    <div class="card">

                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="proyectosTable" class="table table-bordered table-striped" style="width:100%">
                                    <thead>
                                        <tr>
                                            <!-- Encabezados -->
                                            <th class="buscarEnca">Código</th>
                                            <th class="buscarEnca">Municipio/Depto.</th>
                                            <th class="buscarEnca">Proyecto</th>
                                            <th class="buscarEnca">Residente</th>
                                            <th class="buscarEnca">Teléfono</th>
                                            <th class="buscarEnca">Bodeguero</th>
                                            <th class="buscarEnca">Teléfono</th>
                                            <th class="buscarEnca">Zona</th>
                                            <th class="buscarEnca">Estado</th>
                                            <th class="buscarEnca">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Contenido llenado por DataTables -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>

<?php include_once "footer.php"; ?>

<!-- *** JAVASCRIPT PARA DATATABLES (Sin cambios) *** -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
    var table;
    var initialTotalRecords = <?php echo $initialTotalRecords; ?>;

    $(document).ready(function() {
        table = $('#proyectosTable').DataTable({
            "processing": true,
            "serverSide": true,
            "ajax": {
                "url": "listaDeProyectos_dt.php",
                "type": "GET"
            },
            "dom": '<"row"<"col-sm-12 col-md-6"f><"col-sm-12 col-md-6">><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"><"col-sm-12 col-md-7"p>>',
            //"deferLoading": [ 0, initialTotalRecords ],
            "columns": [
                { "data": "codigoProyecto"},
                { "data": "municipio"},
                { "data": "nombreProyecto"},
                { "data": "residente"},
                { "data": "telefonoR" },
                { "data": "bodeguero"},
                { "data": "telefonoB" },
                { "data": "zona" },
                { "data": "status" },
                {
                    "data": "idProyecto",
                    "orderable": false,
                    "searchable": false,
                    "className": "action-buttons", // Clase para los botones
                    "render": function(data, type, row) {
                        let editUrl = `editarProyectos.php?id=${data}`;
                        return `<a href="${editUrl}" class="btn btn-secondary btn-sm" title="Editar"><i class="bi bi-pencil"></i></a> ` +
                               `<button class="btn btn-danger btn-sm" onclick="confirmarEliminacionProyecto(${data})" title="Eliminar"><i class="bi bi-trash"></i></button>`;
                    }
                }
            ],
            "language": {
                "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
                 "processing": "Procesando...",
                 "zeroRecords": "No se encontraron resultados",
                 "emptyTable": "Ningún dato disponible en esta tabla",
                 "search": "Buscar:",
            },

            "responsive": true,
            "scrollX": false,
            "autoWidth": false,
            "deferRender": true,
            "pageLength": 10,
            "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
            "order": [[0, 'asc']],
             "drawCallback": function( settings ) {
                console.log("DrawCallback: Adjusting columns");
                $(this).DataTable().columns.adjust();
            },
            "initComplete": function(settings, json) {
                 console.log("InitComplete: Adjusting columns after delay");
                 setTimeout( function () {
                    // Usar settings.nTable para asegurar que se refiere a la tabla correcta
                    $(settings.nTable).DataTable().columns.adjust();
                 }, 200);
            }
        });
    }); // Fin $(document).ready

    // --- Función Eliminar con SweetAlert2 (Sin cambios) ---
    function confirmarEliminacionProyecto(idProyecto) {
        // ... (código de eliminación) ...
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir la eliminación de este proyecto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch('eliminarProyecto.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify({ idProyecto: idProyecto }) // Asegúrate que eliminarProyecto.php espere JSON
                })
                .then(response => {
                    // Verificar si la respuesta es OK y el contenido es JSON
                    const contentType = response.headers.get("content-type");
                    if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
                        return response.json();
                    } else if (response.ok && response.status === 204) { // No Content, asumir éxito
                        return { success: true, message: 'Proyecto eliminado (sin contenido en respuesta).' };
                    } else {
                        // Si no es JSON o no es OK, intentar obtener texto para el error
                        return response.text().then(text => {
                            let errorMsg = `Error HTTP ${response.status}: ${response.statusText}`;
                            if (text) {
                                try {
                                    // Intentar parsear por si acaso es un JSON de error no bien formado
                                    const parsedError = JSON.parse(text);
                                    errorMsg = parsedError.message || parsedError.error || text;
                                } catch (e) {
                                    errorMsg = text.substring(0, 200); // Mostrar parte del texto si no es JSON
                                }
                            }
                            throw new Error(errorMsg);
                        });
                    }
                })
                .then(data => {
                    if (data.success) {
                        Swal.fire('¡Eliminado!', data.message || 'El proyecto ha sido eliminado.', 'success');
                        table.ajax.reload(null, false);
                    } else { Swal.fire('Error', data.error || 'No se pudo eliminar el proyecto.', 'error'); }
                })
                .catch(error => { console.error('Error en fetch:', error); Swal.fire('Error de Conexión', `Ocurrió un error: ${error.message}`, 'error'); });
            } else {
                // Si el usuario cancela, no hacer nada o mostrar un mensaje de cancelación
                // Swal.fire('Cancelado', 'La eliminación del proyecto fue cancelada.', 'info');
            }
        });
    }

    // --- Código para ajustar columnas con AdminLTE y Resize (Sin cambios) ---
    $(document).on('collapsed.lte.pushmenu shown.lte.pushmenu', function() {
        console.log("AdminLTE Sidebar Toggle: Adjusting columns after delay");
        setTimeout(function() {
            if ($.fn.DataTable.isDataTable('#proyectosTable')) {
                $('#proyectosTable').DataTable().columns.adjust().draw(false);
            }
        }, 350);
    });
    $(window).on('resize', function () {
        console.log("Window Resize: Adjusting columns");
        if ($.fn.DataTable.isDataTable('#proyectosTable')) {
            $('#proyectosTable').DataTable().columns.adjust();
        }
    });
    // --- Fin código AdminLTE ---

</script>
<!-- --- Fin JAVASCRIPT PARA DATATABLES --- -->
