<?php
header('Content-Type: application/json');
session_start();
include_once "helpers.php"; // Para la función usuarioTienePermiso

$response = ['success' => false, 'message' => 'Acción no válida o error desconocido.'];

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_profiles')) {
    $response['message'] = 'Acceso denegado. Permiso insuficiente.';
    echo json_encode($response);
    exit;
}
// --- Fin Control de Acceso ---

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
            $perfil = trim($_POST['perfil'] ?? '');
            if (empty($perfil)) throw new Exception('El nombre del perfil es obligatorio.');

            // Verificar si ya existe
            $stmtCheck = $mysqli->prepare("SELECT idPerfil FROM perfiles WHERE perfil = ?");
            $stmtCheck->bind_param("s", $perfil);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) throw new Exception('El nombre del perfil ya existe.');
            $stmtCheck->close();

            // Insertar
            $stmt = $mysqli->prepare("INSERT INTO perfiles (perfil) VALUES (?)");
            $stmt->bind_param("s", $perfil);
            if (!$stmt->execute()) throw new Exception('Error al guardar el perfil: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Perfil agregado correctamente.'];
            break;

        case 'edit':
            $idPerfil = filter_input(INPUT_POST, 'idPerfil', FILTER_VALIDATE_INT);
            $perfil = trim($_POST['perfil'] ?? '');
            if (!$idPerfil) throw new Exception('ID de perfil no válido.');
            if (empty($perfil)) throw new Exception('El nombre del perfil es obligatorio.');

            // Verificar si el nuevo nombre ya existe (excluyendo el perfil actual)
            $stmtCheck = $mysqli->prepare("SELECT idPerfil FROM perfiles WHERE perfil = ? AND idPerfil != ?");
            $stmtCheck->bind_param("si", $perfil, $idPerfil);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) throw new Exception('El nombre del perfil ya está en uso por otro perfil.');
            $stmtCheck->close();

            // Actualizar
            $stmt = $mysqli->prepare("UPDATE perfiles SET perfil = ? WHERE idPerfil = ?");
            $stmt->bind_param("si", $perfil, $idPerfil);
            if (!$stmt->execute()) throw new Exception('Error al actualizar el perfil: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Perfil actualizado correctamente.'];
            break;

        case 'delete':
            $idPerfil = filter_input(INPUT_POST, 'idPerfil', FILTER_VALIDATE_INT);
            if (!$idPerfil) throw new Exception('ID de perfil no válido.');
            // Opcional: Verificar si hay usuarios con este perfil antes de eliminar
            // $stmtCheckUsers = $mysqli->prepare("SELECT COUNT(*) FROM usuarios WHERE idPerfil = ?"); ...

            // Eliminar (¡Cuidado! Esto eliminará el perfil y podría causar problemas si hay usuarios asignados)
            $stmt = $mysqli->prepare("DELETE FROM perfiles WHERE idPerfil = ?");
            $stmt->bind_param("i", $idPerfil);
            if (!$stmt->execute()) throw new Exception('Error al eliminar el perfil: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Perfil eliminado correctamente.'];
            break;

        default:
            $response['message'] = 'Acción no reconocida.';
            break;
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    // Considerar loggear el error: error_log($e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>