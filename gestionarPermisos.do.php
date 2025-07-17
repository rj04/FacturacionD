<?php
header('Content-Type: application/json');
session_start();
include_once "helpers.php"; // Para la función usuarioTienePermiso

$response = ['success' => false, 'message' => 'Acción no válida o error desconocido.'];

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_profiles')) { // CAMBIAR a un permiso más específico
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
            $clave_permiso = trim($_POST['clave_permiso'] ?? '');
            $descripcion_permiso = trim($_POST['descripcion_permiso'] ?? '');

            if (empty($clave_permiso)) throw new Exception('La clave del permiso es obligatoria.');
            if (!preg_match('/^[a-z0-9_]+$/', $clave_permiso)) throw new Exception('La clave del permiso solo puede contener minúsculas, números y guion bajo.');
            if (empty($descripcion_permiso)) throw new Exception('La descripción del permiso es obligatoria.');

            // Verificar si la clave ya existe
            $stmtCheck = $mysqli->prepare("SELECT idPermiso FROM permisos WHERE nombrePermiso = ?");
            $stmtCheck->bind_param("s", $clave_permiso);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) throw new Exception('La clave del permiso ya existe.');
            $stmtCheck->close();

            // Insertar
            $stmt = $mysqli->prepare("INSERT INTO permisos (nombrePermiso, descripcionPermiso) VALUES (?, ?)");
            $stmt->bind_param("ss", $clave_permiso, $descripcion_permiso);
            if (!$stmt->execute()) throw new Exception('Error al guardar el permiso: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Permiso agregado correctamente.'];
            break;

        // case 'edit_desc': // Si decides implementar edición de descripción
        //     $idPermiso = filter_input(INPUT_POST, 'idPermiso', FILTER_VALIDATE_INT);
        //     $descripcion_permiso = trim($_POST['descripcion_permiso'] ?? '');
        //     if (!$idPermiso) throw new Exception('ID de permiso no válido.');
        //     if (empty($descripcion_permiso)) throw new Exception('La descripción del permiso es obligatoria.');

        //     $stmt = $mysqli->prepare("UPDATE permisos SET descripcion_permiso = ? WHERE idPermiso = ?");
        //     $stmt->bind_param("si", $descripcion_permiso, $idPermiso);
        //     if (!$stmt->execute()) throw new Exception('Error al actualizar la descripción: ' . $stmt->error);
        //     $stmt->close();
        //     $response = ['success' => true, 'message' => 'Descripción del permiso actualizada.'];
        //     break;

        case 'delete':
            $idPermiso = filter_input(INPUT_POST, 'idPermiso', FILTER_VALIDATE_INT);
            if (!$idPermiso) throw new Exception('ID de permiso no válido.');

            // Antes de eliminar, borrar las asignaciones de este permiso en perfil_permisos
            $stmtDelAsign = $mysqli->prepare("DELETE FROM perfil_permisos WHERE idPermiso = ?");
            $stmtDelAsign->bind_param("i", $idPermiso);
            if (!$stmtDelAsign->execute()) throw new Exception('Error al eliminar asignaciones del permiso: ' . $stmtDelAsign->error);
            $stmtDelAsign->close();

            // Eliminar el permiso
            $stmt = $mysqli->prepare("DELETE FROM permisos WHERE idPermiso = ?");
            $stmt->bind_param("i", $idPermiso);
            if (!$stmt->execute()) throw new Exception('Error al eliminar el permiso: ' . $stmt->error);
            $stmt->close();
            $response = ['success' => true, 'message' => 'Permiso eliminado correctamente (junto con sus asignaciones a perfiles).'];
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
