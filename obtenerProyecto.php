<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$mysqli = include_once "conexion.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $codigoProyecto = $_POST['codigoProyecto'];

    $query = "SELECT proyecto FROM proyectos WHERE codigoProyecto = ?";
    $stmt = $mysqli->prepare($query);
    if ($stmt === false) {
        die('Prepare failed: ' . htmlspecialchars($mysqli->error));
    }
    $stmt->bind_param('s', $codigoProyecto);
    $stmt->execute();
    $result = $stmt->get_result();
    $proyecto = $result->fetch_assoc();
    $stmt->close();

    echo json_encode(['proyecto' => $proyecto['proyecto']]);
    exit();
}

echo json_encode(['error' => 'Método no permitido']);
?>
