<?php
// c:\UniServerZ\www\inventario-test\eliminarEstado.php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";
$response = ['success' => false, 'message' => 'Error desconocido.'];

// Validar ID recibido
if (!isset($_POST['idEstado']) || !filter_var($_POST['idEstado'], FILTER_VALIDATE_INT)) {
    $response['message'] = 'ID de estado inválido.';
    echo json_encode($response);
    exit;
}

$idEstado = $_POST['idEstado'];

$sentencia = $mysqli->prepare("DELETE FROM estados WHERE idEstado = ?");

if ($sentencia) {
    $sentencia->bind_param("i", $idEstado);
    if ($sentencia->execute()) {
        if ($sentencia->affected_rows > 0) {
            $response['success'] = true;
            $response['message'] = 'Estado eliminado correctamente.';
        } else {
            $response['message'] = 'No se encontró el estado o no se pudo eliminar.';
        }
    } else {
        $response['message'] = 'Error al ejecutar la eliminación: ' . $sentencia->error;
    }
    $sentencia->close();
} else {
    $response['message'] = 'Error al preparar la consulta de eliminación: ' . $mysqli->error;
}

$mysqli->close();
echo json_encode($response);
?>