<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$mysqli = include_once "conexion.php";

$idEquipo = $_GET['id'] ?? null;

if ($idEquipo) {
    $stmt = $mysqli->prepare("DELETE FROM ingresos_equipos WHERE idIngresoEq = ?");
    $stmt->bind_param('i', $idEquipo);
    if ($stmt->execute()) {
        echo json_encode(["success" => "Equipo eliminado exitosamente."]);
    } else {
        echo json_encode(["error" => "Error al eliminar el equipo: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["error" => "ID del Equipo no proporcionado."]);
}
?>