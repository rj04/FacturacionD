<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
session_start();

// --- Control de Acceso (opcional pero recomendado) ---
// include_once "helpers.php"; // Si necesitas la función usuarioTienePermiso
// if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_profiles')) {
//     echo json_encode(['success' => false, 'message' => 'Acceso denegado.', 'todosLosPermisos' => [], 'permisosDelPerfil' => []]);
//     exit;
// }

$mysqli = include_once "conexion.php";

$response = [
    'success' => false,
    'message' => 'Error desconocido al cargar permisos.',
    'todosLosPermisos' => [],
    'permisosDelPerfil' => []
];

if ($mysqli->connect_error) {
    $response['message'] = 'Error de conexión a la base de datos: ' . $mysqli->connect_error;
    echo json_encode($response);
    exit;
}

$idPerfil = isset($_GET['idPerfil']) ? filter_input(INPUT_GET, 'idPerfil', FILTER_VALIDATE_INT) : null;

if (!$idPerfil) {
    $response['message'] = 'ID de Perfil no válido.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

try {
    // 1. Obtener todos los permisos del sistema
    $resultTodos = $mysqli->query("SELECT idPermiso, nombrePermiso, descripcionPermiso FROM permisos ORDER BY descripcionPermiso ASC");
    if (!$resultTodos) {
        throw new Exception("Error al obtener la lista de todos los permisos: " . $mysqli->error);
    }
    while ($row = $resultTodos->fetch_assoc()) {
        $row['idPermiso'] = (int)$row['idPermiso']; // Asegurar que idPermiso sea entero
        $response['todosLosPermisos'][] = $row;
    }
    $resultTodos->free();

    // 2. Obtener los permisos asignados al perfil específico
    $stmtAsignados = $mysqli->prepare("SELECT idPermiso FROM perfil_permisos WHERE idPerfil = ?");
    if (!$stmtAsignados) {
        throw new Exception("Error preparando consulta de permisos asignados: " . $mysqli->error);
    }
    $stmtAsignados->bind_param("i", $idPerfil);
    if (!$stmtAsignados->execute()) {
        throw new Exception("Error ejecutando consulta de permisos asignados: " . $stmtAsignados->error);
    }
    $resultAsignados = $stmtAsignados->get_result();
    while ($row = $resultAsignados->fetch_assoc()) {
        $response['permisosDelPerfil'][] = (int)$row['idPermiso']; // Asegurar que idPermiso sea entero
    }
    $resultAsignados->free();
    $stmtAsignados->close();

    $response['success'] = true;
    $response['message'] = 'Permisos cargados correctamente.';

} catch (Exception $e) {
    $response['message'] = 'Error al procesar la solicitud de permisos: ' . $e->getMessage();
    error_log("Error en obtenerPermisosPerfil.php para idPerfil $idPerfil: " . $e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>