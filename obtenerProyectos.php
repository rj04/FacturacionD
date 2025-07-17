<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

$mysqli = include_once "conexion.php";

if (!$mysqli) {
    die(json_encode(["error" => "Error al conectar a la base de datos: " . mysqli_connect_error()]));
}

$sql = "SELECT idProyecto, codigoProyecto, proyecto, nombreProyecto FROM proyectos ORDER BY codigoProyecto DESC";
$result = $mysqli->query($sql);

$proyectos = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $proyectos[] = $row;
    }
}

// Asegúrate de devolver un array, incluso si está vacío
echo json_encode($proyectos);

$mysqli->close();
?>
