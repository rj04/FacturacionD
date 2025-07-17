<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
include_once "helpers.php";

if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_users')) {
    header("Location: index.php?error=Acceso denegado");
    exit;
}

include_once "header.php";
include_once "navbar.php";
$mysqli = include_once "conexion.php"; // Necesario para obtener perfiles

// Obtener perfiles para el select
$resultPerfiles = $mysqli->query("SELECT idPerfil, perfil FROM perfiles ORDER BY perfil ASC");
$perfiles = $resultPerfiles->fetch_all(MYSQLI_ASSOC);
$mysqli->close();
?>

<div class="content-wrapper">
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0">Registrar Nuevo Usuario</h1>
                </div>
            </div>
        </div>
    </div>

    <section class="content">
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card card-primary">
                        <div class="card-header">
                            <h3 class="card-title">Datos del Usuario</h3>
                        </div>
                        <form id="addUsuarioForm" class="needs-validation" novalidate>
                            <div class="card-body">
                                <div class="form-group">
                                    <label for="nombre">Nombre Completo <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" name="nombre" id="nombre" placeholder="Ingrese el nombre completo" required>
                                    <div class="invalid-feedback">Por favor, ingrese el nombre completo.</div>
                                </div>
                                <div class="form-group">
                                    <label for="usuario">Nombre de Usuario <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" name="usuario" id="usuario" placeholder="Ingrese el nombre de usuario" required pattern="^[a-zA-Z0-9_]{4,20}$">
                                    <small class="form-text text-muted">De 4 a 20 caracteres, solo letras, números y guion bajo.</small>
                                    <div class="invalid-feedback">Usuario inválido o ya existente.</div>
                                </div>
                                <div class="form-group">
                                    <label for="password">Contraseña <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" name="password" id="password" placeholder="Ingrese la contraseña" required minlength="6">
                                    <small class="form-text text-muted">Mínimo 6 caracteres.</small>
                                    <div class="invalid-feedback">La contraseña debe tener al menos 6 caracteres.</div>
                                </div>
                                <div class="form-group">
                                    <label for="confirm_password">Confirmar Contraseña <span class="text-danger">*</span></label>
                                    <input type="password" class="form-control" name="confirm_password" id="confirm_password" placeholder="Confirme la contraseña" required>
                                    <div class="invalid-feedback">Las contraseñas no coinciden.</div>
                                </div>
                                <div class="form-group">
                                    <label for="idPerfil">Perfil <span class="text-danger">*</span></label>
                                    <select class="form-control" name="idPerfil" id="idPerfil" required>
                                        <option value="">-- Seleccione un perfil --</option>
                                        <?php foreach ($perfiles as $perfil): ?>
                                            <option value="<?php echo $perfil['idPerfil']; ?>"><?php echo htmlspecialchars($perfil['perfil']); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <div class="invalid-feedback">Seleccione un perfil.</div>
                                </div>
                            </div>
                            <div class="card-footer text-center">
                                <button type="submit" class="btn btn-primary">Registrar Usuario</button>
                                <a href="listarUsuarios.php" class="btn btn-secondary ml-2">Cancelar</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<?php include_once "footer.php"; ?>

<script>
$(document).ready(function() {
    $('#addUsuarioForm').on('submit', function(e) {
        e.preventDefault();
        if (!this.checkValidity()) { $(this).addClass('was-validated'); return; }

        if ($('#password').val() !== $('#confirm_password').val()) {
            $('#confirm_password').addClass('is-invalid').siblings('.invalid-feedback').text('Las contraseñas no coinciden.');
            return;
        } else {
            $('#confirm_password').removeClass('is-invalid');
        }
        // Usar la función global handleFormSubmit si la tienes, o una similar
        handleFormSubmit(this, 'gestionarUsuarios.do.php?action=add', null, null, 'listarUsuarios.php'); // Redirigir a la lista
    });
});

// Necesitarás la función handleFormSubmit aquí o en un JS global
// Si no la tienes, puedes adaptar la de listarUsuarios.php
// Para la redirección, he añadido un quinto parámetro a handleFormSubmit
function handleFormSubmit(form, url, table, modalSelector = null, redirectUrl = null) {
    const formData = new FormData(form);
    const submitButton = $(form).find('button[type="submit"]');
    const originalButtonHtml = submitButton.html();
    submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...');

    fetch(url, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Swal.fire('¡Éxito!', data.message, 'success').then(() => {
                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else if (table) {
                        table.ajax.reload(null, false);
                    }
                });
                if (modalSelector) $(modalSelector).modal('hide');
                form.reset();
                $(form).removeClass('was-validated');
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