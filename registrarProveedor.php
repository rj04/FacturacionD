<?php 
error_reporting(E_ALL);
ini_set('display_errors', 1);
$mysqli = include_once "conexion.php";
include_once "header.php"; 
include_once "navbar.php";

$error = isset($_GET['error']) ? $_GET['error'] : '';

// Ya no necesitamos consultar el último código si usamos la tabla proveedores
// $resultado = $mysqli->query("SELECT proveedor FROM proveedores ORDER BY idProveedor DESC LIMIT 1");
// $ultimoProveedor = $resultado ? ($resultado->fetch_assoc()['proveedor'] ?? 'N/A') : 'Error';
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <div class="content-header">
    <div class="container-fluid">
      <div class="row mb-2">
        <div class="col-sm-6">
          <h1 class="m-0">Gestión de Proveedores</h1>
        </div><!-- /.col -->
      </div><!-- /.row -->
    </div><!-- /.container-fluid -->
  </div>
  <!-- /.content-header -->

  <!-- Main content -->
  <section class="content">
    <div class="container-fluid">
        <!-- Formulario para agregar -->
        <div class="card card-primary mb-4">
            <div class="card-header">
                <h3 class="card-title">Agregar Nuevo Proveedor</h3>
            </div>
            <form id="addProveedorForm" class="needs-validation" novalidate>
                <div class="card-body">
                    <div class="row">
                        <!-- Ajustar ancho del campo nombre -->
                        <div class="col-md-10 form-group">
                            <label for="nombreProveedor">Nombre del Proveedor*</label>
                            <input placeholder="Nombre completo del proveedor" class="form-control" type="text" name="nombreProveedor" id="nombreProveedor" required>
                            <div class="invalid-feedback">Por favor, ingrese el nombre del proveedor.</div>
                        </div>
                        <div class="col-md-2 form-group d-flex align-items-end">
                            <button type="submit" class="btn btn-success w-100">
                                <i class="fas fa-plus mr-1"></i> Agregar
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>

        <!-- Tabla de Proveedores -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Lista de Proveedores Registrados</h3>
            </div>
            <!-- *** INICIO: Búsqueda Personalizada *** -->
            <div class="card-body pb-0">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="customSearchInput">Buscar Proveedor:</label>
                        <input type="text" id="customSearchInput" placeholder="Nombre del proveedor..." class="form-control">
                    </div>
                </div>
            </div>
            <!-- *** FIN: Búsqueda Personalizada *** -->
            <div class="card-body">
                <div class="table-responsive">
                    <table id="proveedoresTable" class="table table-bordered table-striped" width="100%">
                        <thead>
                            <tr>
                                    <th>ID</th> <!-- idProveedor -->
                                <th>Nombre Proveedor</th>
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
    </div><!-- /.container-fluid -->
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<!-- Modal para Editar Proveedor -->
<div class="modal fade" id="editProveedorModal" tabindex="-1" aria-labelledby="editProveedorModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="editProveedorModalLabel">Editar Proveedor</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form id="editProveedorForm">
        <div class="modal-body">
          <input type="hidden" name="idProveedor" id="editIdProveedor">
          <div class="form-group">
            <label for="editNombreProveedor">Nombre del Proveedor</label>
            <input type="text" class="form-control" id="editNombreProveedor" name="nombreProveedor" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cambios</button>
        </div>
      </form>
    </div>
  </div>
</div>

<?php include_once "footer.php"; ?>

<!-- Estilos (opcionales) -->
<style>
    #proveedoresTable {
        width: 100%;
        font-size: 0.9rem;
    }
    #proveedoresTable td:last-child {
        white-space: nowrap;
        text-align: center;
    }
</style>

<!-- JavaScript -->
<script>
$(document).ready(function() {
    // 1. Inicializar DataTables
    var table = $('#proveedoresTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "registrarProveedor_dt.php", // Nuevo script backend
            "type": "GET",
            "data": function ( d ) {
                // Enviar valor del input personalizado
                d.customSearch = $('#customSearchInput').val();
            }
        },
        "dom": '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>', // 't', 'r', 'i', 'p'
        "searching": false, // Deshabilitar el buscador global de DataTables
        "columns": [
            { "data": "idProveedor", "width": "10%" }, // Usar idProveedor
            { "data": "proveedor" }, // Usar proveedor
            {
                "data": "idProveedor", // Usar idProveedor para acciones
                "orderable": false,
                "searchable": false,
                "width": "15%",
                "render": function(data, type, row) {
                    // Botones Editar y Eliminar
                    return `<button class="btn btn-secondary btn-sm mr-1 edit-btn" data-id="${row.idProveedor}" data-nombre="${row.proveedor}" title="Editar"><i class="bi bi-pencil"></i></button>` +
                           `<button onclick="confirmarEliminacion(${data})" class="btn btn-danger btn-sm" title="Eliminar"><i class="bi bi-trash"></i></button>`;
                }
            }
        ],
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
            "processing": "Procesando...",
            "emptyTable": "No hay proveedores registrados",
            "zeroRecords": "No se encontraron proveedores"
        },
        "responsive": true,
        "autoWidth": false,
        "pageLength": 10,
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
        "order": [[ 1, "asc" ]] // Ordenar por nombre de proveedor por defecto
    });

    // 2. Manejo del envío del formulario con AJAX
    $('#addProveedorForm').on('submit', function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }
        $(this).addClass('was-validated');

        const formData = new FormData(this);
        const submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Agregando...');

        fetch('registrarProveedor.do.php', { // Usamos el .do para la inserción
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: data.message || 'Proveedor agregado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
                $('#addProveedorForm')[0].reset(); // Limpiar formulario
                $('#addProveedorForm').removeClass('was-validated');
                table.ajax.reload(); // Recargar la tabla DataTables
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo agregar el proveedor.'
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Comunicación',
                text: 'No se pudo conectar con el servidor.'
            });
        })
        .finally(() => {
            submitButton.prop('disabled', false).html('<i class="fas fa-plus mr-1"></i> Agregar');
        });
    });

    // *** INICIO: Eventos para búsqueda personalizada ***
    let debounceTimer;
    $('#customSearchInput').on('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            table.ajax.reload(); // Recargar DataTables
        }, 500); // Búsqueda con debounce de 500ms
    });
    // *** FIN: Eventos para búsqueda personalizada ***

    // *** INICIO: Eventos para MODAL DE EDICIÓN ***
    $('#proveedoresTable tbody').on('click', '.edit-btn', function () {
        const idProveedor = $(this).data('id');
        const nombreProveedor = $(this).data('nombre');
        $('#editIdProveedor').val(idProveedor);
        $('#editNombreProveedor').val(nombreProveedor);
        $('#editProveedorModal').modal('show');
    });

    $('#editProveedorForm').on('submit', function(e) {
        e.preventDefault();
        // Usar la función global handleFormSubmit si la tienes, o una similar
        handleFormSubmit(this, 'registrarProveedor.do.php?action=edit', table, '#editProveedorModal');
    });
    // *** FIN: Eventos para MODAL DE EDICIÓN ***


}); // Fin document ready

// 3. Función para confirmar eliminación (global)
function confirmarEliminacion(idProveedor) { // Recibe idProveedor
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir la eliminación de este proveedor!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('eliminarProveedor.php', { // Nuevo script para eliminar
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `idProveedor=${idProveedor}` // Enviar idProveedor
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire(
                        '¡Eliminado!',
                        'El proveedor ha sido eliminado.',
                        'success'
                    );
                    $('#proveedoresTable').DataTable().ajax.reload(null, false); // Recargar sin resetear paginación
                } else {
                    Swal.fire(
                        'Error',
                        data.message || 'No se pudo eliminar el proveedor.',
                        'error'
                    );
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire(
                    'Error de Conexión',
                    'Ocurrió un error al intentar eliminar.',
                    'error'
                );
            });
        }
    });
}
</script>
