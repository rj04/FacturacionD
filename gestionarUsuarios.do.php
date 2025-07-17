<?php
header('Content-Type: application/json');
session_start();
include_once "helpers.php";

$response = ['success' => false, 'message' => 'Acción no válida o error desconocido.'];

if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_users')) {
    $response['message'] = 'Acceso denegado. Permiso insuficiente.';
    echo json_encode($response);
    exit;
}
$usuarioActualId = $_SESSION['idUsuario'];

$mysqli = include_once "conexion.php";
if ($mysqli->connect_error) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

$action = $_GET['action'] ?? null;

try {
    switch ($action) {
        case 'add':
            $nombre = trim($_POST['nombre'] ?? '');
            $usuario = trim($_POST['usuario'] ?? '');
            $password = $_POST['password'] ?? '';
            $idPerfil = filter_input(INPUT_POST, 'idPerfil', FILTER_VALIDATE_INT);

            if (empty($nombre) || empty($usuario) || empty($password) || !$idPerfil) {
                throw new Exception('Todos los campos marcados con * son obligatorios.');
            }
            if (strlen($password) < 6) {
                throw new Exception('La contraseña debe tener al menos 6 caracteres.');
            }
            if (!preg_match('/^[a-zA-Z0-9_]{4,20}$/', $usuario)) {
                throw new Exception('Nombre de usuario inválido (4-20 caracteres, solo letras, números y guion bajo).');
            }

            // Verificar si el usuario ya existe
            $stmtCheck = $mysqli->prepare("SELECT idUsuario FROM usuarios WHERE usuario = ?");
            $stmtCheck->bind_param("s", $usuario);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) {
                throw new Exception('El nombre de usuario ya está en uso.');
            }
            $stmtCheck->close();

            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $mysqli->prepare("INSERT INTO usuarios (nombre, usuario, password, idPerfil) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("sssi", $nombre, $usuario, $hashed_password, $idPerfil);
            if (!$stmt->execute()) throw new Exception('Error al guardar el usuario: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Usuario agregado correctamente.'];
            break;

        case 'edit':
            $idUsuario = filter_input(INPUT_POST, 'idUsuario', FILTER_VALIDATE_INT);
            $nombre = trim($_POST['nombre'] ?? '');
            $usuario = trim($_POST['usuario'] ?? '');
            $idPerfil = filter_input(INPUT_POST, 'idPerfil', FILTER_VALIDATE_INT);

            if (!$idUsuario || empty($nombre) || empty($usuario) || !$idPerfil) {
                throw new Exception('Todos los campos son obligatorios.');
            }
             if (!preg_match('/^[a-zA-Z0-9_]{4,20}$/', $usuario)) {
                throw new Exception('Nombre de usuario inválido (4-20 caracteres, solo letras, números y guion bajo).');
            }

            // Verificar si el nuevo nombre de usuario ya existe (excluyendo el usuario actual)
            $stmtCheck = $mysqli->prepare("SELECT idUsuario FROM usuarios WHERE usuario = ? AND idUsuario != ?");
            $stmtCheck->bind_param("si", $usuario, $idUsuario);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) {
                throw new Exception('El nombre de usuario ya está en uso por otro usuario.');
            }
            $stmtCheck->close();

            $stmt = $mysqli->prepare("UPDATE usuarios SET nombre = ?, usuario = ?, idPerfil = ? WHERE idUsuario = ?");
            $stmt->bind_param("ssii", $nombre, $usuario, $idPerfil, $idUsuario);
            if (!$stmt->execute()) throw new Exception('Error al actualizar el usuario: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Usuario actualizado correctamente.'];
            break;

        case 'delete':
            $idUsuario = filter_input(INPUT_POST, 'idUsuario', FILTER_VALIDATE_INT);
            if (!$idUsuario) throw new Exception('ID de usuario no válido.');
            if ($idUsuario == 1) throw new Exception('No se puede eliminar al usuario Super Administrador.');
            if ($idUsuario == $usuarioActualId) throw new Exception('No puedes eliminar tu propia cuenta.');

            // Opcional: Verificar si el usuario a eliminar es Superadmin (idPerfil = 1)
            // $stmtCheckPerfil = $mysqli->prepare("SELECT idPerfil FROM usuarios WHERE idUsuario = ?"); ...

            $stmt = $mysqli->prepare("DELETE FROM usuarios WHERE idUsuario = ?");
            $stmt->bind_param("i", $idUsuario);
            if (!$stmt->execute()) throw new Exception('Error al eliminar el usuario: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Usuario eliminado correctamente.'];
            break;

        case 'reset_password':
            if (!usuarioTienePermiso('reset_user_password')) {
                 throw new Exception('No tienes permiso para restablecer contraseñas.');
            }
            $idUsuario = filter_input(INPUT_POST, 'idUsuario', FILTER_VALIDATE_INT);
            $newPassword = $_POST['newPassword'] ?? '';

            if (!$idUsuario || empty($newPassword)) {
                throw new Exception('ID de usuario o nueva contraseña no proporcionados.');
            }
            if (strlen($newPassword) < 6) {
                throw new Exception('La nueva contraseña debe tener al menos 6 caracteres.');
            }
            if ($idUsuario == 1 && $usuarioActualId != 1) { // Solo el superadmin puede cambiar su propia pass o la de otro superadmin
                throw new Exception('No se puede cambiar la contraseña de este usuario.');
            }

            $hashed_password = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $mysqli->prepare("UPDATE usuarios SET password = ? WHERE idUsuario = ?");
            $stmt->bind_param("si", $hashed_password, $idUsuario);
            if (!$stmt->execute()) throw new Exception('Error al restablecer la contraseña: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Contraseña restablecida correctamente.'];
            break;

        default:
            $response['message'] = 'Acción no reconocida.';
            break;
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

$mysqli->close();
echo json_encode($response);
?>