<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
include_once "helpers.php"; // Para la función usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_users')) {
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
                    <h1 class="m-0">Gestionar Usuarios</h1>
                </div>
                <div class="col-sm-6 text-sm-right mt-2 mt-sm-0">
                    <a href="registrarUsuario.php" class="btn btn-primary">
                        <i class="fas fa-plus mr-1"></i> Agregar Nuevo Usuario
                    </a>
                </div>
            </div>
        </div>
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
        <div class="container-fluid">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Lista de Usuarios Registrados</h3>
                </div>
                <!-- *** INICIO: Búsqueda Personalizada *** -->
                <div class="card-body pb-0">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label for="customSearchInput">Buscar Usuario:</label>
                            <input type="text" id="customSearchInput" placeholder="Nombre, usuario o perfil..." class="form-control">
                        </div>
                    </div>
                </div>
                <!-- *** FIN: Búsqueda Personalizada *** -->
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="usuariosTable" class="table table-bordered table-striped" width="100%">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre Completo</th>
                                    <th>Usuario</th>
                                    <th>Perfil</th>
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

<!-- Modal para Editar Usuario -->
<div class="modal fade" id="editUsuarioModal" tabindex="-1" aria-labelledby="editUsuarioModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="editUsuarioModalLabel">Editar Usuario</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form id="editUsuarioForm">
        <div class="modal-body">
          <input type="hidden" name="idUsuario" id="editIdUsuario">
          <div class="form-group">
            <label for="editNombreCompleto">Nombre Completo</label>
            <input type="text" class="form-control" id="editNombreCompleto" name="nombre" required>
          </div>
          <div class="form-group">
            <label for="editUsuario">Nombre de Usuario</label>
            <input type="text" class="form-control" id="editUsuario" name="usuario" required>
          </div>
          <div class="form-group">
            <label for="editIdPerfil">Perfil</label>
            <select class="form-control" id="editIdPerfil" name="idPerfil" required>
                <!-- Opciones de perfil se cargarán aquí o se pueden hardcodear si son pocas -->
            </select>
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

<!-- Modal para Cambiar Contraseña (Admin) -->
<div class="modal fade" id="resetPasswordModal" tabindex="-1" aria-labelledby="resetPasswordModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="resetPasswordModalLabel">Restablecer Contraseña para <span id="resetPasswordUserName"></span></h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>
      <form id="resetPasswordForm">
        <div class="modal-body">
          <input type="hidden" name="idUsuario" id="resetIdUsuario">
          <div class="form-group">
            <label for="newPassword">Nueva Contraseña</label>
            <input type="password" class="form-control" id="newPassword" name="newPassword" required minlength="6">
            <small class="form-text text-muted">Mínimo 6 caracteres.</small>
          </div>
          <div class="form-group">
            <label for="confirmNewPassword">Confirmar Nueva Contraseña</label>
            <input type="password" class="form-control" id="confirmNewPassword" name="confirmNewPassword" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
          <button type="submit" class="btn btn-warning">Restablecer Contraseña</button>
        </div>
      </form>
    </div>
  </div>
</div>


<?php include_once "footer.php"; ?>

<style>
    #usuariosTable td:last-child { white-space: nowrap; text-align: center; }
</style>

<script>
let perfilesData = []; // Para almacenar los perfiles

$(document).ready(function() {
    // Cargar perfiles para el modal de edición
    $.ajax({
        url: 'obtenerPerfiles.php', // Script que devuelve lista de perfiles
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            perfilesData = data;
            const selectPerfil = $('#editIdPerfil');
            selectPerfil.empty().append('<option value="">Seleccione un perfil</option>');
            perfilesData.forEach(perfil => {
                selectPerfil.append(`<option value="${perfil.idPerfil}">${perfil.perfil}</option>`);
            });
        }
    });

    var table = $('#usuariosTable').DataTable({
        "processing": true,
        "serverSide": true,
        "ajax": {
            "url": "listarUsuarios_dt.php",
            "type": "GET",
            "data": function(d) {
                d.customSearch = $('#customSearchInput').val();
            }
        },
        "dom": '<"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>', // Quitar 'f' y 'l'
        "searching": false, // Deshabilitar el buscador global de DataTables
        "columns": [
            { "data": "idUsuario", "width": "5%" },
            { "data": "nombre" },
            { "data": "usuario" },
            { "data": "perfilNombre" }, // Nombre del perfil desde el JOIN en el backend
            {
                "data": null,
                "orderable": false,
                "searchable": false,
                "width": "20%",
                "render": function(data, type, row) {
                    let actions = `<button class="btn btn-secondary btn-sm mr-1 edit-btn" data-id="${row.idUsuario}" title="Editar"><i class="bi bi-pencil"></i></button>`;
                    <?php if (usuarioTienePermiso('reset_user_password')): ?>
                    actions += `<button class="btn btn-warning btn-sm mr-1 reset-pass-btn" data-id="${row.idUsuario}" data-user="${row.usuario}" title="Cambiar Contraseña"><i class="bi bi-key"></i></button>`;
                    <?php endif; ?>
                    // Evitar que el superadmin (ID 1) se elimine a sí mismo o a otro superadmin
                    if (row.idUsuario != 1 && <?php echo $_SESSION['idUsuario']; ?> != row.idUsuario && row.idPerfil != 1) {
                         actions += `<button class="btn btn-danger btn-sm delete-btn" data-id="${row.idUsuario}" title="Eliminar"><i class="bi bi-trash"></i></button>`;
                    }
                    return actions;
                }
            }
        ],
        "language": { "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json" },
        "order": [[1, "asc"]]
    });

    // --- Eventos para Modales y Acciones ---
    $('#usuariosTable tbody').on('click', '.edit-btn', function() {
        const idUsuario = $(this).data('id');
        // Obtener datos del usuario para prellenar el modal (AJAX o desde la fila si ya los tienes)
        $.ajax({
            url: 'obtenerUsuario.php?idUsuario=' + idUsuario, // Script para obtener datos de un usuario
            type: 'GET',
            dataType: 'json',
            success: function(userData) {
                $('#editIdUsuario').val(userData.idUsuario);
                $('#editNombreCompleto').val(userData.nombre);
                $('#editUsuario').val(userData.usuario);
                $('#editIdPerfil').val(userData.idPerfil);
                $('#editUsuarioModal').modal('show');
            }
        });
    });

    $('#editUsuarioForm').on('submit', function(e) {
        e.preventDefault();
        handleFormSubmit(this, 'gestionarUsuarios.do.php?action=edit', table, '#editUsuarioModal');
    });

    $('#usuariosTable tbody').on('click', '.delete-btn', function() {
        const idUsuario = $(this).data('id');
        confirmarEliminacion(idUsuario, 'gestionarUsuarios.do.php?action=delete', table, 'Este usuario será eliminado permanentemente.');
    });

    $('#usuariosTable tbody').on('click', '.reset-pass-btn', function() {
        const idUsuario = $(this).data('id');
        const userName = $(this).data('user');
        $('#resetIdUsuario').val(idUsuario);
        $('#resetPasswordUserName').text(userName);
        $('#resetPasswordForm')[0].reset();
        $('#resetPasswordModal').modal('show');
    });

    $('#resetPasswordForm').on('submit', function(e) {
        e.preventDefault();
        const newPass = $('#newPassword').val();
        const confirmPass = $('#confirmNewPassword').val();
        if (newPass !== confirmPass) {
            Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
            return;
        }
        handleFormSubmit(this, 'gestionarUsuarios.do.php?action=reset_password', table, '#resetPasswordModal');
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


}); // Fin document ready

// Funciones auxiliares (reutilizadas de gestionarPerfiles.php, adaptadas si es necesario)
// ... (handleFormSubmit y confirmarEliminacion, puedes copiarlas aquí o incluirlas desde un JS común) ...
// Por ahora, las copio aquí para que funcione:
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
                table.ajax.reload(null, false);
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

function confirmarEliminacion(id, url, table, text = "¡No podrás revertir esto!") {
    Swal.fire({
        title: '¿Estás seguro?', text: text, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡eliminar!', cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(url, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: `idUsuario=${id}`})
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
                    Swal.fire('Error de Conexión', 'Ocurrió un error al intentar eliminar.', 'error');
                });
        }
    });
}
</script>
