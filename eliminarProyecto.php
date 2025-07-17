<?php
session_start();
header('Content-Type: application/json'); // <<< ¡AÑADE ESTA LÍNEA AL PRINCIPIO!

if (!isset($_SESSION['idUsuario'])) {
    // Asegúrate de que la salida aquí también sea JSON válido
    echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
    exit();
}

$mysqli = include_once "conexion.php";

// Verificar conexión mysqli
if ($mysqli->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Error de conexión a la base de datos: ' . $mysqli->connect_error]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

// Verificar si se recibieron datos JSON y el ID
if ($data === null || !isset($data['idProyecto'])) {
     echo json_encode(['success' => false, 'error' => 'Datos inválidos o ID de proyecto no proporcionado']);
     $mysqli->close();
     exit();
}

$idProyecto = $data['idProyecto'];

// Validar que idProyecto sea un entero
if (!filter_var($idProyecto, FILTER_VALIDATE_INT)) {
    echo json_encode(['success' => false, 'error' => 'ID de proyecto inválido']);
    $mysqli->close();
    exit();
}


if ($stmt = $mysqli->prepare("DELETE FROM proyectos WHERE idProyecto = ?")) {
    $stmt->bind_param("i", $idProyecto);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Proyecto eliminado correctamente.']); // Añadir mensaje opcional
        } else {
            // No se eliminó (quizás el ID no existía), pero la consulta fue exitosa
            echo json_encode(['success' => false, 'error' => 'No se encontró el proyecto para eliminar o no se realizaron cambios.']);
        }
    } else {
        // Error al ejecutar
        error_log("Error al ejecutar DELETE: " . $stmt->error); // Loggear error real
        echo json_encode(['success' => false, 'error' => 'Error al intentar eliminar el proyecto.']); // Mensaje genérico
    }
    $stmt->close();
} else {
    // Error al preparar
    error_log("Error al preparar DELETE: " . $mysqli->error); // Loggear error real
    echo json_encode(['success' => false, 'error' => 'Error interno del servidor al preparar la eliminación.']); // Mensaje genérico
}

$mysqli->close();
?>
