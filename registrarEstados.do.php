<?php
// c:\UniServerZ\www\inventario-test\registrarEstados.do.php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";
$response = ['success' => false, 'message' => 'Error desconocido.'];

// Validar datos recibidos
if (empty($_POST["estado"])) {
    $response['message'] = 'El nombre del estado es obligatorio.';
    echo json_encode($response);
    exit;
}

$estado = trim($_POST["estado"]);

$sentencia = $mysqli->prepare("INSERT INTO estados (estado) VALUES (?)");

if ($sentencia) {
    $sentencia->bind_param("s", $estado);
    if ($sentencia->execute()) {
        $response['success'] = true;
        $response['message'] = 'Estado agregado correctamente.';
    } else {
        $response['message'] = 'Error al guardar en la base de datos: ' . $sentencia->error;
    }
    $sentencia->close();
} else {
    $response['message'] = 'Error al preparar la consulta: ' . $mysqli->error;
}
$mysqli->close();
echo json_encode($response);
?>