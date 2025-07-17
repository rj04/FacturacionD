<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
include_once "helpers.php"; // Para la función usuarioTienePermiso

// --- Control de Acceso ---
// Necesitarás un permiso para esta página, por ejemplo 'manage_all_permissions'
// Por ahora, usaremos 'manage_profiles' como placeholder si aún no lo tienes.
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_profiles')) { // CAMBIAR a un permiso más específico si lo creas
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
                    <h1 class="m-0">Gestionar Permisos del Sistema</h1>
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
                    <h3 class="card-title">Agregar Nuevo Permiso</h3>
                </div>
                <form id="addPermisoForm" class="needs-validation" novalidate>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-5 form-group">
                                <label for="clavePermiso">Clave del Permiso*</label>
                                <input placeholder="Ej: view_reports, manage_users" class="form-control" type="text" name="clave_permiso" id="clavePermiso" required pattern="^[a-z0-9_]+$">
                                <small class="form-text text-muted">Solo minúsculas, números y guion bajo. Sin espacios.</small>
                                <div class="invalid-feedback">Clave inválida o ya existente.</div>
                            </div>
                            <div class="col-md-5 form-group">
                                <label for="descripcionPermiso">Descripción del Permiso*</label>
                                <input placeholder="Ej: Ver reportes, Gestionar usuarios del sistema" class="form-control" type="text" name="descripcion_permiso" id="descripcionPermiso" required>
                                <div class="invalid-feedback">Por favor, ingrese la descripción.</div>
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

            <!-- Tabla de Permisos -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Lista de Permisos Registrados</h3>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="permisosTable" class="table table-bordered table-striped" width="100%">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Clave del Permiso</th>
                                    <th>Descripción</th>
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

<!-- Modal para Editar Permiso (Opcional, si decides implementarlo) -->
<!--
<div class="modal fade" id="editPermisoModal" tabindex="-1" aria-labelledby="editPermisoModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="editPermisoModalLabel">Editar Permiso</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>
      <form id="editPermisoForm">
        <div class="modal-body">
          <input type="hidden" name="idPermiso" id="editIdPermiso">
          <div class="form-group">
            <label for="editClavePermiso">Clave del Permiso</label>
            <input type="text" class="form-control" id="editClavePermiso" name="clave_permiso" readonly>
            <small class="form-text text-muted">La clave no se puede editar una vez creada.</small>
          </div>
          <div class="form-group">
            <label for="editDescripcionPermiso">Descripción del Permiso</label>
            <input type="text" class="form-control" id="editDescripcionPermiso" name="descripcion_permiso" required>
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
-->

<?php include_once "footer.php"; ?>

<style>
    #permisosTable td:last-child { white-space: nowrap; text-align: center; }
</style>

<script>
$(document).ready(function() {
    var table = $('#permisosTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "gestionarPermisos_dt.php",
            "type": "GET"
        },
        "columns": [
            { "data": "idPermiso", "width": "10%" },
            { "data": "nombrePermiso" },      // Corregido: Usar 'nombrePermiso'
            { "data": "descripcionPermiso" },        // Corregido: Usar 'descripcion'
            {
                "data": null,
                "orderable": false,
                "searchable": false,
                "width": "10%",
                "render": function(data, type, row) {
                    // Por ahora solo botón de eliminar. Editar es más complejo por si la clave se usa en código.
                    // let editBtn = `<button class="btn btn-secondary btn-sm mr-1 edit-btn" data-id="${row.idPermiso}" data-clave="${row.clave_permiso}" data-descripcion="${row.descripcion_permiso}" title="Editar Descripción"><i class="bi bi-pencil"></i></button>`;
                    let deleteBtn = `<button class="btn btn-danger btn-sm delete-btn" data-id="${row.idPermiso}" title="Eliminar Permiso"><i class="bi bi-trash"></i></button>`;
                    return deleteBtn; // Solo deleteBtn por ahora
                }
            }
        ],
        "language": { "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json" },
        "responsive": true, "autoWidth": false, "pageLength": 10,
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
        "order": [[ 2, "asc" ]] // Ordenar por descripción
    });

    $('#addPermisoForm').on('submit', function(e) {
        e.preventDefault();
        if (!this.checkValidity()) { $(this).addClass('was-validated'); return; }
        handleFormSubmit(this, 'gestionarPermisos.do.php?action=add', table);
    });

    // $('#permisosTable tbody').on('click', '.edit-btn', function () {
    //     $('#editIdPermiso').val($(this).data('id'));
    //     $('#editClavePermiso').val($(this).data('clave'));
    //     $('#editDescripcionPermiso').val($(this).data('descripcion'));
    //     $('#editPermisoModal').modal('show');
    // });

    // $('#editPermisoForm').on('submit', function(e) {
    //     e.preventDefault();
    //     handleFormSubmit(this, 'gestionarPermisos.do.php?action=edit_desc', table, '#editPermisoModal');
    // });

    $('#permisosTable tbody').on('click', '.delete-btn', function () {
        const idPermiso = $(this).data('id');
        confirmarEliminacionPermiso(idPermiso, 'gestionarPermisos.do.php?action=delete', table);
    });

});

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
                if (modalSelector) $(modalSelector).modal('hide');
                form.reset();
                $(form).removeClass('was-validated');
                table.ajax.reload();
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

function confirmarEliminacionPermiso(id, url, table) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡Eliminar un permiso puede afectar la funcionalidad del sistema si está en uso! Esta acción no se puede revertir.",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6', confirmButtonText: 'Sí, ¡eliminar!', cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(url, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: `idPermiso=${id}`})
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('¡Eliminado!', data.message, 'success');
                        table.ajax.reload(null, false);
                    } else {
                        Swal.fire('Error', data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire('Error de Conexión', 'Ocurrió un error al intentar eliminar el permiso.', 'error');
                });
        }
    });
}
</script>
<?php
// Es importante que el permiso 'manage_all_permissions' (o el que elijas)
// se cree primero manualmente en la BD y se asigne al perfil de administrador.
?>
