<?php
header('Content-Type: application/json');
session_start();

$response = ['success' => false, 'message' => 'Error desconocido.'];

if (!isset($_SESSION['idUsuario'])) {
    $response['message'] = 'Debe iniciar sesión para cambiar su contraseña.';
    echo json_encode($response);
    exit;
}

$idUsuario = $_SESSION['idUsuario'];
$current_password = $_POST['current_password'] ?? '';
$new_password = $_POST['new_password'] ?? '';
$confirm_new_password = $_POST['confirm_new_password'] ?? '';

if (empty($current_password) || empty($new_password) || empty($confirm_new_password)) {
    $response['message'] = 'Todos los campos son obligatorios.';
    echo json_encode($response);
    exit;
}

if (strlen($new_password) < 6) {
    $response['message'] = 'La nueva contraseña debe tener al menos 6 caracteres.';
    echo json_encode($response);
    exit;
}

if ($new_password !== $confirm_new_password) {
    $response['message'] = 'La nueva contraseña y la confirmación no coinciden.';
    echo json_encode($response);
    exit;
}

$mysqli = include_once "conexion.php";
if ($mysqli->connect_error) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

try {
    // 1. Obtener la contraseña actual hasheada del usuario
    $stmt = $mysqli->prepare("SELECT password FROM usuarios WHERE idUsuario = ?");
    $stmt->bind_param("i", $idUsuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $usuario = $result->fetch_assoc();
    $stmt->close();

    if (!$usuario) {
        throw new Exception('Usuario no encontrado.'); // No debería pasar si está logueado
    }

    // 2. Verificar la contraseña actual
    if (!password_verify($current_password, $usuario['password'])) {
        throw new Exception('La contraseña actual es incorrecta.');
    }

    // 3. Hashear y actualizar la nueva contraseña
    $hashed_new_password = password_hash($new_password, PASSWORD_DEFAULT);
    $stmtUpdate = $mysqli->prepare("UPDATE usuarios SET password = ? WHERE idUsuario = ?");
    $stmtUpdate->bind_param("si", $hashed_new_password, $idUsuario);
    if (!$stmtUpdate->execute()) {
        throw new Exception('Error al actualizar la contraseña: ' . $stmtUpdate->error);
    }
    $stmtUpdate->close();

    $response = ['success' => true, 'message' => 'Contraseña actualizada correctamente.'];

} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

$mysqli->close();
echo json_encode($response);
?>