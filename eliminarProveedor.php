<?php
// c:\UniServerZ\www\inventario-test\eliminarProveedor.php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";
$response = ['success' => false, 'message' => 'Error desconocido.'];

// Validar ID recibido (es idProveedor)
if (!isset($_POST['idProveedor']) || !filter_var($_POST['idProveedor'], FILTER_VALIDATE_INT)) {
    $response['message'] = 'ID de proveedor inválido.';
    echo json_encode($response);
    exit;
}

$idProveedor = $_POST['idProveedor'];

$sentencia = $mysqli->prepare("DELETE FROM proveedores WHERE idProveedor = ? "); // Tabla 'proveedores'

if ($sentencia) {
    $sentencia->bind_param("i", $idProveedor); // Usar $idProveedor
    if ($sentencia->execute()) {
        if ($sentencia->affected_rows > 0) {
            $response['success'] = true;
            $response['message'] = 'Proveedor eliminado correctamente.';
        } else {
            $response['message'] = 'No se encontró el proveedor o no se pudo eliminar.';
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