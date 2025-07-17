<?php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";

if ($mysqli->connect_error) {
    echo json_encode([]); // Devuelve array vacío en caso de error
    exit;
}

$result = $mysqli->query("SELECT idPerfil, perfil FROM perfiles ORDER BY perfil ASC");
$perfiles = [];
if ($result) {
    $perfiles = $result->fetch_all(MYSQLI_ASSOC);
    $result->free();
}
$mysqli->close();
echo json_encode($perfiles);
?>