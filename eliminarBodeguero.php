<?php
// c:\UniServerZ\www\inventario-test\eliminarBodeguero.php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";
$response = ['success' => false, 'message' => 'Error desconocido.'];

// Validar ID recibido (usaremos POST por seguridad)
if (!isset($_POST['idBodeguero']) || !filter_var($_POST['idBodeguero'], FILTER_VALIDATE_INT)) {
    $response['message'] = 'ID de bodeguero inválido.';
    echo json_encode($response);
    exit;
}

$idBodeguero = $_POST['idBodeguero'];

$sentencia = $mysqli->prepare("DELETE FROM bodegueros WHERE idBodeguero = ?");

if ($sentencia) {
    $sentencia->bind_param("i", $idBodeguero);
    if ($sentencia->execute()) {
        if ($sentencia->affected_rows > 0) {
            $response['success'] = true;
            $response['message'] = 'Bodeguero eliminado correctamente.';
        } else {
            $response['message'] = 'No se encontró el bodeguero o no se pudo eliminar.';
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