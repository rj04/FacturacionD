<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once "header.php";
include_once "navbar.php"; 

$mysqli = include_once "conexion.php";
// Ya no necesitamos la lógica de paginación manual aquí
?>

<div class="content-wrapper"> 
    <div class="container-fluid"> <!-- Usar container-fluid para ancho completo -->
        <div class="content-header">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0" style="font-size:20px">Lista de Bodegueros</h1>
                </div>
                <div class="col-sm-6 text-right">
                    <a href="agregarBodeguero.php" class="btn btn-primary">Agregar Nuevo Bodeguero</a>
                </div>
            </div>
        </div>

        <section class="content">
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <!-- *** INICIO: Búsqueda Personalizada *** -->
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="customSearchInput">Buscar Bodeguero:</label>
                                    <div class="input-group">
                                        <input type="text" id="customSearchInput" placeholder="Nombre o teléfono..." class="form-control">
                                        <div class="input-group-append">
                                            <button id="customSearchBtn" class="btn btn-primary" type="button"><i class="fas fa-search"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- *** FIN: Búsqueda Personalizada *** -->
                            <div class="table-responsive">
                                <table id="bodeguerosTable" class="table table-bordered table-striped" width="100%">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Bodeguero</th>
                                            <th>Teléfono</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- DataTables llenará esto -->
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


<!-- Estilos (opcionales) -->
<style>
    #bodeguerosTable {
        width: 100%;
        font-size: 0.9rem;
    }
    #bodeguerosTable td:last-child {
        white-space: nowrap;
        text-align: center;
    }
</style>

<?php include_once "footer.php"; ?>

<!-- JavaScript -->
<script>
$(document).ready(function() {
    // 1. Inicializar DataTables
    var table = $('#bodeguerosTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "listarBodegueros_dt.php", // Nuevo script backend
            "type": "GET",
            // *** Añadir función data para enviar búsqueda personalizada ***
            "data": function ( d ) {
                d.customSearch = $('#customSearchInput').val(); // Enviar valor del input personalizado
            }
        },
        "searching": false, // Ocultar búsqueda por defecto de DataTables
        // *** Modificar DOM para quitar la 'f' (filtro/search) por defecto ***
        "dom": '<"row"<"col-sm-12 col-md-6"><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"><"col-sm-12 col-md-7"p>>', // Layout estándar con búsqueda global (f) si la quieres
        "columns": [
            { "data": "idBodeguero", "width": "10%" },
            { "data": "bodeguero" },
            { "data": "telefono", "width": "20%" },
            {
                "data": "idBodeguero", // ID para acciones
                "orderable": false,
                "searchable": false,
                "width": "15%",
                "render": function(data, type, row) {
                    let editUrl = `editarBodeguero.php?idBodeguero=${data}`;
                    return `<a href="${editUrl}" class="btn btn-secondary btn-sm mr-1" title="Editar"><i class="bi bi-pencil"></i></a>` +
                           `<button onclick="confirmarEliminacion(${data})" class="btn btn-danger btn-sm" title="Eliminar"><i class="bi bi-trash"></i></button>`;
                }
            }
        ],
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
            "processing": "Procesando...",
            "emptyTable": "No hay bodegueros registrados",
            "zeroRecords": "No se encontraron bodegueros"
        },
        "responsive": true,
        "autoWidth": false,
        "pageLength": 10,
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
        "order": [[ 1, "asc" ]] // Ordenar por nombre de bodeguero por defecto
    });

    // *** INICIO: Eventos para búsqueda personalizada ***
    let debounceTimer; // Variable para el temporizador del debounce

    // Evento click en el botón de búsqueda
    $('#customSearchBtn').on('click', function() {
        table.ajax.reload(); // Recargar DataTables
    });

    // Evento al escribir en el input de búsqueda (con debounce)
    $('#customSearchInput').on('input', function() {
        clearTimeout(debounceTimer); // Limpiar el temporizador anterior
        debounceTimer = setTimeout(function() { // Establecer un nuevo temporizador
            table.ajax.reload(); // Recargar DataTables después de 500ms de inactividad
        }, 500); // Ajusta el tiempo de espera (en milisegundos) como necesites
    });
    // *** FIN: Eventos para búsqueda personalizada ***
}); // Fin document ready

// 2. Función para confirmar eliminación (global)
function confirmarEliminacion(idBodeguero) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir la eliminación de este bodeguero!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('eliminarBodeguero.php', { // Usar el script de eliminación existente
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `idBodeguero=${idBodeguero}` // Enviar ID
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire('¡Eliminado!', 'El bodeguero ha sido eliminado.', 'success');
                    $('#bodeguerosTable').DataTable().ajax.reload(null, false); // Recargar sin resetear paginación
                } else {
                    Swal.fire('Error', data.message || 'No se pudo eliminar el bodeguero.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire('Error de Conexión', 'Ocurrió un error al intentar eliminar.', 'error');
            });
        }
    });
}
</script>
