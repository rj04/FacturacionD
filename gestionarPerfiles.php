<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
include_once "helpers.php"; // Para la función usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_profiles')) {
    header("Location: index.php?error=Acceso denegado");
    exit;
}
// --- Fin Control de Acceso ---

include_once "header.php";
include_once "navbar.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0">Gestionar Perfiles (Roles)</h1>
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
                    <h3 class="card-title">Agregar Nuevo Perfil</h3>
                </div>
                <form id="addPerfilForm" class="needs-validation" novalidate>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-10 form-group">
                                <label for="nombrePerfil">Nombre del Perfil*</label>
                                <input placeholder="Ej: Administrador, Bodeguero, Lector" class="form-control" type="text" name="perfil" id="nombrePerfil" required>
                                <div class="invalid-feedback">Por favor, ingrese el nombre del perfil.</div>
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

            <!-- Tabla de Perfiles -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Lista de Perfiles Registrados</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="perfilesTable" class="table table-bordered table-striped" width="100%">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre del Perfil</th>
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

<!-- Modal para Editar Perfil -->
<div class="modal fade" id="editPerfilModal" tabindex="-1" aria-labelledby="editPerfilModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="editPerfilModalLabel">Editar Perfil</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form id="editPerfilForm">
        <div class="modal-body">
          <input type="hidden" name="idPerfil" id="editIdPerfil">
          <div class="form-group">
            <label for="editNombrePerfil">Nombre del Perfil</label>
            <input type="text" class="form-control" id="editNombrePerfil" name="perfil" required>
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
    #perfilesTable td:last-child {
        white-space: nowrap;
        text-align: center;
    }
</style>

<!-- JavaScript -->
<script>
$(document).ready(function() {
    // 1. Inicializar DataTables
    var table = $('#perfilesTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "gestionarPerfiles_dt.php", // Script backend para DataTables
            "type": "GET"
        },
        "dom": '<"row"<"col-sm-12 col-md-6"><"col-sm-12 col-md-6">><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"><"col-sm-12 col-md-7"p>>',
        "columns": [
            { "data": "idPerfil", "width": "10%" },
            { "data": "perfil" },
            {
                "data": null, // Usaremos 'null' para renderizar botones
                "orderable": false,
                "searchable": false,
                "width": "15%",
                "render": function(data, type, row) {
                    // Botones Editar y Eliminar
                    return `<button class="btn btn-secondary btn-sm mr-1 edit-btn" data-id="${row.idPerfil}" data-nombre="${row.perfil}" title="Editar"><i class="bi bi-pencil"></i></button>` +
                           `<button class="btn btn-danger btn-sm delete-btn" data-id="${row.idPerfil}" title="Eliminar"><i class="bi bi-trash"></i></button>`;
                }
            }
        ],
        "language": { "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json" },
        "responsive": true, "autoWidth": false, "pageLength": 10,
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
        "order": [[ 1, "asc" ]] // Ordenar por nombre de perfil
    });

    // 2. Manejo del formulario para AGREGAR perfil
    $('#addPerfilForm').on('submit', function(e) {
        e.preventDefault();
        if (!this.checkValidity()) { $(this).addClass('was-validated'); return; }
        handleFormSubmit(this, 'gestionarPerfiles.do.php?action=add', table);
    });

    // 3. Abrir MODAL DE EDICIÓN al hacer clic en el botón Editar
    $('#perfilesTable tbody').on('click', '.edit-btn', function () {
        const idPerfil = $(this).data('id');
        const nombrePerfil = $(this).data('nombre');
        $('#editIdPerfil').val(idPerfil);
        $('#editNombrePerfil').val(nombrePerfil);
        $('#editPerfilModal').modal('show');
    });

    // 4. Manejo del formulario para EDITAR perfil (dentro del modal)
    $('#editPerfilForm').on('submit', function(e) {
        e.preventDefault();
        handleFormSubmit(this, 'gestionarPerfiles.do.php?action=edit', table, '#editPerfilModal');
    });

    // 5. Manejo del botón ELIMINAR
    $('#perfilesTable tbody').on('click', '.delete-btn', function () {
        const idPerfil = $(this).data('id');
        confirmarEliminacion(idPerfil, 'gestionarPerfiles.do.php?action=delete', table);
    });

}); // Fin document ready

// Funciones auxiliares (puedes moverlas a un archivo JS global si las usas en más sitios)
function handleFormSubmit(form, url, table, modalSelector = null) {
    const formData = new FormData(form);
    const submitButton = $(form).find('button[type="submit"]');
    const originalButtonHtml = submitButton.html();
    submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...');

    fetch(url, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire('¡Éxito!', data.message, 'success');
                if (modalSelector) $(modalSelector).modal('hide'); // Ocultar modal si existe
                form.reset();
                $(form).removeClass('was-validated');
                table.ajax.reload(); // Recargar DataTables
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire('Error de Comunicación', 'No se pudo conectar con el servidor.', 'error');
        })
        .finally(() => {
            submitButton.prop('disabled', false).html(originalButtonHtml);
        });
}

function confirmarEliminacion(id, url, table) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto! Asegúrate de que ningún usuario esté usando este perfil.",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6', confirmButtonText: 'Sí, ¡eliminar!', cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(url, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: `idPerfil=${id}`})
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('¡Eliminado!', data.message, 'success');
                        table.ajax.reload(null, false); // Recargar sin resetear paginación
                    } else {
                        Swal.fire('Error', data.message, 'error');
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