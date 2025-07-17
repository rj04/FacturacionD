<?php
// c:\UniServerZ\www\facturacion\marcarMultiplesOcasImpresas.php
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

$idsOca = isset($_POST['idOcas']) && is_array($_POST['idOcas']) ? $_POST['idOcas'] : null;
$nuevo_estado = isset($_POST['nuevo_estado']) ? filter_input(INPUT_POST, 'nuevo_estado', FILTER_VALIDATE_INT) : null;

if ($idsOca === null || empty($idsOca) || $nuevo_estado === null || !in_array($nuevo_estado, [0, 1])) {
    $response['message'] = 'Datos inválidos para actualizar estados en lote.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

$mysqli->begin_transaction();
$errores = 0;
$exitos = 0;

try {
    foreach ($idsOca as $idOcaCrudo) {
        $idOca = filter_var($idOcaCrudo, FILTER_VALIDATE_INT);
        if ($idOca === false) {
            $errores++;
            error_log("ID de OCA inválido en lote: " . $idOcaCrudo);
            continue;
        }

        // Obtener estado anterior para el historial
        $stmtOld = $mysqli->prepare("SELECT impresa FROM control_ocas WHERE idOca = ?");
        if (!$stmtOld) throw new Exception("Error preparando consulta estado anterior (lote): " . $mysqli->error);
        $stmtOld->bind_param("i", $idOca);
        if (!$stmtOld->execute()) throw new Exception("Error ejecutando consulta estado anterior (lote): " . $stmtOld->error);
        $resultOld = $stmtOld->get_result();
        $ocaActual = $resultOld->fetch_assoc();
        $stmtOld->close();
        $estado_anterior = $ocaActual ? (int)$ocaActual['impresa'] : null;

        // Actualizar estado
        $stmtUpdate = $mysqli->prepare("UPDATE control_ocas SET impresa = ? WHERE idOca = ?");
        if (!$stmtUpdate) throw new Exception("Error preparando actualización (lote): " . $mysqli->error);
        $stmtUpdate->bind_param("ii", $nuevo_estado, $idOca);
        if (!$stmtUpdate->execute()) {
            throw new Exception("Error al actualizar OCA ID $idOca (lote): " . $stmtUpdate->error);
        }
        $stmtUpdate->close();

        // Registrar en Historial (solo si cambió y se conocía el estado anterior)
        if ($estado_anterior !== null && $estado_anterior != $nuevo_estado) {
            $tipo_accion = "actualizar_impresion_lote";
            $tabla_afectada = "control_ocas";
            $datos_anteriores_historial = json_encode(['impresa' => $estado_anterior]);
            $datos_nuevos_historial = json_encode(['impresa' => $nuevo_estado]);

            $sentenciaHistorial = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
            if ($sentenciaHistorial) {
                $sentenciaHistorial->bind_param("ississ", $usuario_id, $tipo_accion, $tabla_afectada, $idOca, $datos_anteriores_historial, $datos_nuevos_historial);
                if (!$sentenciaHistorial->execute()) {
                    error_log("Error al registrar cambio (lote) en historial para OCA ID $idOca: " . $sentenciaHistorial->error);
                }
                $sentenciaHistorial->close();
            } else {
                 error_log("Error al preparar sentencia historial (lote) para OCA ID $idOca: " . $mysqli->error);
            }
        }
        $exitos++;
    }

    $mysqli->commit();
    $response['success'] = true;
    $response['message'] = "$exitos OCA(s) actualizadas correctamente.";
    if ($errores > 0) {
        $response['message'] .= " $errores OCA(s) no pudieron ser procesadas (IDs inválidos).";
    }

} catch (Exception $e) {
    $mysqli->rollback();
    $response['message'] = "Error durante el proceso en lote: " . $e->getMessage();
    error_log("Error en marcarMultiplesOcasImpresas.php: " . $e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>