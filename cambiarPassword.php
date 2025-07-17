<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
include_once "helpers.php"; // Para la función usuarioTienePermiso (aunque aquí solo necesitamos que esté logueado)

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario'])) { // Solo verificar que esté logueado
    header("Location: index.php?error=Debe iniciar sesión para cambiar su contraseña.");
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
                    <h1 class="m-0" style="font-size:20px">Cambiar Mi Contraseña</h1>
                </div>
            </div>
        </div>
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card card-primary">
                        <div class="card-header">
                            <h3 class="card-title">Actualizar Contraseña</h3>
                        </div>
                        <form id="changePasswordForm">
                            <div class="card-body">
                                <div class="form-group">
                                    <label for="current_password">Contraseña Actual <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" name="current_password" id="current_password" required>
                                </div>
                                <div class="form-group">
                                    <label for="new_password">Nueva Contraseña <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" name="new_password" id="new_password" required minlength="6">
                                    <small class="form-text text-muted">Mínimo 6 caracteres.</small>
                                </div>
                                <div class="form-group">
                                    <label for="confirm_new_password">Confirmar Nueva Contraseña <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" name="confirm_new_password" id="confirm_new_password" required>
                                </div>
                            </div>
                            <div class="card-footer text-center">
                                <button type="submit" class="btn btn-primary">Cambiar Contraseña</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div><!-- /.container-fluid -->
    </section>
    <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<?php include_once "footer.php"; ?>

<script>
$(document).ready(function() {
    $('#changePasswordForm').on('submit', function(e) {
        e.preventDefault();
        const newPassword = $('#new_password').val();
        const confirmNewPassword = $('#confirm_new_password').val();

        if (newPassword !== confirmNewPassword) {
            Swal.fire('Error', 'La nueva contraseña y la confirmación no coinciden.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            Swal.fire('Error', 'La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        // Usar la función global handleFormSubmit si la tienes, o una similar
        // El 'table' y 'modalSelector' son null porque no hay tabla que recargar ni modal que cerrar aquí
        // El último parámetro true es para resetear el formulario en caso de éxito
        handleFormSubmit(this, 'cambiarPassword.do.php', null, null, true);
    });
});

function handleFormSubmit(form, url, table, modalSelector = null, resetFormOnSuccess = false) {
   const formData = new FormData(form);
   const submitButton = $(form).find('button[type="submit"]');
   const originalButtonHtml = submitButton.html();
   submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...');

   fetch(url, { method: 'POST', body: formData })
       .then(response => response.json())
       .then(data => {
           if (data.success) {
               Swal.fire('¡Éxito!', data.message, 'success');
               if (modalSelector) $(modalSelector).modal('hide');
               if (resetFormOnSuccess) { // Resetear el formulario si se indica
                   form.reset();
               }
               if (table) table.ajax.reload(null, false);
               $(form).removeClass('was-validated'); // Quitar clases de validación
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
</script>