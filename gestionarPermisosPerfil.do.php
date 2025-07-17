<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
session_start(); // Para control de acceso y auditoría si es necesario

// --- Control de Acceso ---
// if (!isset($_SESSION['idUsuario']) /* || !usuarioTienePermiso('manage_profiles') */ ) {
//     echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
//     exit;
// }
// --- Fin Control de Acceso ---

$mysqli = include_once "conexion.php";

$response = ['success' => false, 'message' => 'Error desconocido.'];

if ($mysqli->connect_error) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

$idPerfil = isset($_POST['idPerfil']) ? filter_input(INPUT_POST, 'idPerfil', FILTER_VALIDATE_INT) : null;
$permisosSeleccionados = isset($_POST['permisos']) && is_array($_POST['permisos']) ? $_POST['permisos'] : [];

if (!$idPerfil) {
    $response['message'] = 'ID de Perfil no válido.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

// Iniciar transacción
$mysqli->begin_transaction();

try {
    // 1. Eliminar permisos actuales para este perfil
    $stmtDelete = $mysqli->prepare("DELETE FROM perfil_permisos WHERE idPerfil = ?");
    if (!$stmtDelete) throw new Exception("Error preparando DELETE: " . $mysqli->error);
    $stmtDelete->bind_param("i", $idPerfil);
    if (!$stmtDelete->execute()) throw new Exception("Error ejecutando DELETE: " . $stmtDelete->error);
    $stmtDelete->close();

    // 2. Insertar los nuevos permisos seleccionados (si hay alguno)
    if (!empty($permisosSeleccionados)) {
        // *** Asegurar que los IDs de permiso sean únicos antes de insertar ***
        $permisosUnicos = array_unique(array_map('intval', $permisosSeleccionados));

        $sqlInsert = "INSERT INTO perfil_permisos (idPerfil, idPermiso) VALUES (?, ?)";
        $stmtInsert = $mysqli->prepare($sqlInsert);
        if (!$stmtInsert) throw new Exception("Error preparando INSERT: " . $mysqli->error);

        foreach ($permisosUnicos as $idPermiso) { // Iterar sobre los permisos únicos
            // Ya están validados como int por array_map y filter_var no es estrictamente necesario aquí
            // pero lo mantenemos por si acaso.
            $stmtInsert->bind_param("ii", $idPerfil, $idPermiso);
            if (!$stmtInsert->execute()) throw new Exception("Error ejecutando INSERT para permiso $idPermiso: " . $stmtInsert->error);
        }
        $stmtInsert->close();
    }

    // Confirmar transacción
    $mysqli->commit();
    $response['success'] = true;
    $response['message'] = 'Permisos actualizados correctamente.';

} catch (Exception $e) {
    $mysqli->rollback(); // Revertir cambios en caso de error
    $response['message'] = 'Error al actualizar permisos: ' . $e->getMessage();
    error_log("Error en gestionarPermisosPerfil.do.php: " . $e->getMessage()); // Log del error
}

$mysqli->close();
echo json_encode($response);
?>