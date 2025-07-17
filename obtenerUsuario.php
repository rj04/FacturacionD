<?php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";

if ($mysqli->connect_error) {
    echo json_encode(['error' => 'DB Connection Error']);
    exit;
}

$idUsuario = isset($_GET['idUsuario']) ? intval($_GET['idUsuario']) : 0;

if ($idUsuario > 0) {
    $stmt = $mysqli->prepare("SELECT idUsuario, nombre, usuario, idPerfil FROM usuarios WHERE idUsuario = ?");
    $stmt->bind_param("i", $idUsuario);
    $stmt->execute();
    $result = $stmt->get_result();
    $usuario = $result->fetch_assoc();
    $stmt->close();
    echo json_encode($usuario ?: ['error' => 'Usuario no encontrado']);
} else {
    echo json_encode(['error' => 'ID de Usuario no válido']);
}

$mysqli->close();
?>