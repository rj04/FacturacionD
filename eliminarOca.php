<?php
$mysqli = include_once "conexion.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['idAmpo']; // Asegúrate de que estás recibiendo el ID correctamente

    // Preparar la consulta de eliminación
    $deleteQuery = "DELETE FROM ampos WHERE idAmpo = ?";
    $stmtDelete = $mysqli->prepare($deleteQuery);
    
    if ($stmtDelete === false) {
        die("Error en la preparación de la consulta: " . $mysqli->error);
    }

    $stmtDelete->bind_param("i", $id);

    if ($stmtDelete->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => $stmtDelete->error]);
    }

    $stmtDelete->close();
}
?> 