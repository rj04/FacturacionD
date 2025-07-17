<?php
// c:\UniServerZ\www\facturacion\marcarLoteNoImpreso.php
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

$idLote = isset($_POST['idLote']) ? filter_input(INPUT_POST, 'idLote', FILTER_VALIDATE_INT) : null;

if (!$idLote) {
    $response['message'] = 'ID de Lote no proporcionado o inválido.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

$mysqli->begin_transaction();

try {
    // 1. Obtener los idOca asociados al lote
    $sqlGetOcas = "SELECT idOca FROM lote_ocas WHERE idLote = ?";
    $stmtGetOcas = $mysqli->prepare($sqlGetOcas);
    if (!$stmtGetOcas) throw new Exception("Error preparando consulta para obtener OCAs del lote: " . $mysqli->error);
    $stmtGetOcas->bind_param("i", $idLote);
    if (!$stmtGetOcas->execute()) throw new Exception("Error ejecutando consulta para obtener OCAs del lote: " . $stmtGetOcas->error);
    
    $resultOcas = $stmtGetOcas->get_result();
    $idOcasAfectadas = [];
    while ($row = $resultOcas->fetch_assoc()) {
        $idOcasAfectadas[] = $row['idOca'];
    }
    $stmtGetOcas->close();

    if (empty($idOcasAfectadas)) {
        // Aunque no es un error fatal, informamos que no había OCAs que marcar.
        $mysqli->commit(); // Confirmar la transacción (no hubo cambios)
        $response['success'] = true;
        $response['message'] = 'No se encontraron OCAs asociadas a este lote para actualizar.';
        echo json_encode($response);
        $mysqli->close();
        exit;
    }

    // 2. Actualizar el estado 'impresa' a 0 para todas las OCAs del lote
    $placeholders = implode(',', array_fill(0, count($idOcasAfectadas), '?'));
    $types = str_repeat('i', count($idOcasAfectadas));

    $sqlUpdateOcas = "UPDATE control_ocas SET impresa = 0 WHERE idOca IN ($placeholders)";
    $stmtUpdateOcas = $mysqli->prepare($sqlUpdateOcas);
    if (!$stmtUpdateOcas) throw new Exception("Error preparando actualización de OCAs: " . $mysqli->error);
    $stmtUpdateOcas->bind_param($types, ...$idOcasAfectadas);
    if (!$stmtUpdateOcas->execute()) throw new Exception("Error actualizando OCAs: " . $stmtUpdateOcas->error);
    $filasAfectadas = $stmtUpdateOcas->affected_rows;
    $stmtUpdateOcas->close();

    // 3. Registrar en historial para cada OCA afectada (opcional, pero recomendado)
    $tipo_accion = "marcar_no_impresa_lote";
    $tabla_afectada = "control_ocas";
    $datos_anteriores_historial = json_encode(['impresa' => 1]); // Asumimos que estaban impresas
    $datos_nuevos_historial = json_encode(['impresa' => 0]);

    $stmtHistorial = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
    if (!$stmtHistorial) throw new Exception("Error preparando inserción en historial: " . $mysqli->error);

    foreach ($idOcasAfectadas as $idOcaHist) {
        $stmtHistorial->bind_param("ississ", $usuario_id, $tipo_accion, $tabla_afectada, $idOcaHist, $datos_anteriores_historial, $datos_nuevos_historial);
        if (!$stmtHistorial->execute()) error_log("Error insertando en historial para OCA ID $idOcaHist (lote $idLote): " . $stmtHistorial->error);
    }
    $stmtHistorial->close();

    $mysqli->commit();
    $response['success'] = true;
    $response['message'] = "$filasAfectadas OCA(s) del lote han sido marcadas como 'No Impresas'.";

} catch (Exception $e) {
    $mysqli->rollback();
    $response['message'] = 'Error al procesar la solicitud: ' . $e->getMessage();
    error_log("Error en marcarLoteNoImpreso.php: " . $e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>