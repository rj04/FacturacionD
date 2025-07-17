<?php
// c:\UniServerZ\www\inventario-test\eliminarResidente.php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";
$response = ['success' => false, 'message' => 'Error desconocido.'];

// Validar ID recibido
if (!isset($_POST['idResidente']) || !filter_var($_POST['idResidente'], FILTER_VALIDATE_INT)) {
    $response['message'] = 'ID de residente inválido.';
    echo json_encode($response);
    exit;
}

$idResidente = $_POST['idResidente'];

$sentencia = $mysqli->prepare("DELETE FROM residentes WHERE idResidente = ?");

if ($sentencia) {
    $sentencia->bind_param("i", $idResidente);
    if ($sentencia->execute()) {
        if ($sentencia->affected_rows > 0) {
            $response['success'] = true;
            $response['message'] = 'Residente eliminado correctamente.';
        } else {
            $response['message'] = 'No se encontró el residente o no se pudo eliminar.';
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