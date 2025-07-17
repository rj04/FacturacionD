<?php
// c:\UniServerZ\www\facturacion\actualizarEstadoImpresionOca.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
header('Content-Type: application/json');

$response = ['success' => false, 'message' => 'Error desconocido.'];

if (!isset($_SESSION['idUsuario'])) {
    $response['message'] = 'Acceso denegado. Sesión no válida.';
    echo json_encode($response);
    exit;
}
$usuario_id = $_SESSION['idUsuario'];

$mysqli = include_once "conexion.php";
if ($mysqli->connect_error) {
    $response['message'] = "Error de conexión a la base de datos: " . $mysqli->connect_error;
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Método no permitido.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

$idOca = isset($_POST['idOca']) ? filter_input(INPUT_POST, 'idOca', FILTER_VALIDATE_INT) : null;
$nuevo_estado = isset($_POST['nuevo_estado']) ? filter_input(INPUT_POST, 'nuevo_estado', FILTER_VALIDATE_INT) : null;

if ($idOca === null || $nuevo_estado === null || !in_array($nuevo_estado, [0, 1])) {
    $response['message'] = 'Datos inválidos para actualizar el estado.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

$mysqli->begin_transaction();

try {
    // Obtener estado anterior para el historial
    $stmtOld = $mysqli->prepare("SELECT impresa FROM control_ocas WHERE idOca = ?");
    if (!$stmtOld) {
        throw new Exception("Error al preparar la consulta para obtener estado anterior: " . $mysqli->error);
    }
    $stmtOld->bind_param("i", $idOca);
    if (!$stmtOld->execute()) {
        throw new Exception("Error al ejecutar la consulta para obtener estado anterior: " . $stmtOld->error);
    }
    $resultOld = $stmtOld->get_result();
    $ocaActual = $resultOld->fetch_assoc();
    $stmtOld->close();
    $estado_anterior = $ocaActual ? (int)$ocaActual['impresa'] : null; // Convertir a int o null

    $stmtUpdate = $mysqli->prepare("UPDATE control_ocas SET impresa = ? WHERE idOca = ?");
    if (!$stmtUpdate) {
        throw new Exception("Error al preparar la actualización del estado de la OCA: " . $mysqli->error);
    }
    $stmtUpdate->bind_param("ii", $nuevo_estado, $idOca);
    if (!$stmtUpdate->execute()) {
        throw new Exception("Error al actualizar el estado de la OCA: " . $stmtUpdate->error);
    }
    $stmtUpdate->close();

    // Solo registrar en historial si el estado realmente cambió y se conocía el estado anterior
    if ($estado_anterior !== null && $estado_anterior != $nuevo_estado) {
        $tipo_accion = "actualizar_impresion";
        $tabla_afectada = "control_ocas";
        // Asegurarse de que los datos para el historial sean consistentes
        $datos_anteriores_historial = json_encode(['impresa' => $estado_anterior]);
        $datos_nuevos_historial = json_encode(['impresa' => $nuevo_estado]);

        $sentenciaHistorial = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
        if ($sentenciaHistorial) {
            $sentenciaHistorial->bind_param("ississ", $usuario_id, $tipo_accion, $tabla_afectada, $idOca, $datos_anteriores_historial, $datos_nuevos_historial);
            if (!$sentenciaHistorial->execute()) {
                // Loguear error pero no necesariamente revertir la transacción principal por esto
                error_log("Error al registrar cambio de impresión en historial: " . $sentenciaHistorial->error);
            }
            $sentenciaHistorial->close();
        } else {
            error_log("Error al preparar sentencia de historial para impresión: " . $mysqli->error);
        }
    }

    $mysqli->commit();
    $response = ['success' => true, 'message' => 'Estado de la OCA actualizado correctamente.'];
} catch (Exception $e) {
    $mysqli->rollback();
    $response['message'] = $e->getMessage();
    error_log("Error en actualizarEstadoImpresionOca.php: " . $e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>