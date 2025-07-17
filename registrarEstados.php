<?php 
// c:\UniServerZ\www\inventario-test\registrarEstados.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
include_once "header.php"; 
include_once "navbar.php";
$mysqli = include_once "conexion.php"; // Incluir conexión
 ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Registro de Estados</h1>
          </div>
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
                    <h3 class="card-title">Agregar Nuevo Estado</h3>
                </div>
                <form id="addEstadoForm" class="needs-validation" novalidate>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-10 form-group">
                                <label for="nombreEstado">Nombre del Estado*</label>
                                <input placeholder="Ej: Bueno, Dañado, En Reparación..." class="form-control" type="text" name="estado" id="nombreEstado" required >
                                <div class="invalid-feedback">Por favor, ingrese el nombre del estado.</div>
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

            <!-- Tabla de Estados -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Lista de Estados Registrados</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="estadosTable" class="table table-bordered table-striped" width="100%">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Estado</th>
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

<?php include_once "footer.php"; ?>

<!-- Estilos (opcionales) -->
<style>
    #estadosTable {
        width: 100%;
        font-size: 0.9rem;
    }
    #estadosTable td:last-child {
        white-space: nowrap;
        text-align: center;
    }
</style>

<!-- JavaScript -->
<script>
$(document).ready(function() {
    // 1. Inicializar DataTables
    var table = $('#estadosTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "registrarEstados_dt.php", // Nuevo script backend
            "type": "GET"
        },
        "dom": '<"row"<"col-sm-12 col-md-6"><"col-sm-12 col-md-6">><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"><"col-sm-12 col-md-7"p>>',
        "columns": [
            { "data": "idEstado", "width": "10%" },
            { "data": "estado" },
            {
                "data": "idEstado", // ID para acciones
                "orderable": false,
                "searchable": false,
                "width": "15%",
                "render": function(data, type, row) {
                    return `<button onclick="confirmarEliminacion(${data})" class="btn btn-danger btn-sm"><i class="bi bi-trash"></i> Eliminar</button>`;
                }
            }
        ],
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json",
            "processing": "Procesando...",
            "emptyTable": "No hay estados registrados",
            "zeroRecords": "No se encontraron estados"
        },
        "responsive": true,
        "autoWidth": false,
        "pageLength": 10,
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
        "order": [[ 1, "asc" ]] // Ordenar por nombre de estado por defecto
    });

    // 2. Manejo del envío del formulario con AJAX
    $('#addEstadoForm').on('submit', function(event) {
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

        fetch('registrarEstados.do.php', { // Usamos el .do para la inserción
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: data.message || 'Estado agregado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
                $('#addEstadoForm')[0].reset(); // Limpiar formulario
                $('#addEstadoForm').removeClass('was-validated');
                table.ajax.reload(); // Recargar la tabla DataTables
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'No se pudo agregar el estado.'
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

}); // Fin document ready

// 3. Función para confirmar eliminación (global)
function confirmarEliminacion(idEstado) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir la eliminación de este estado!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('eliminarEstado.php', { // Nuevo script para eliminar
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `idEstado=${idEstado}` // Enviar ID
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire(
                        '¡Eliminado!',
                        'El estado ha sido eliminado.',
                        'success'
                    );
                    $('#estadosTable').DataTable().ajax.reload(null, false); // Recargar sin resetear paginación
                } else {
                    Swal.fire(
                        'Error',
                        data.message || 'No se pudo eliminar el estado.',
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
