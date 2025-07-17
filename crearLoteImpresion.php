<?php
// c:\UniServerZ\www\facturacion\crearLoteImpresion.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
header('Content-Type: application/json');

$response = ['success' => false, 'message' => 'Error desconocido.'];

// Verificar sesión de usuario
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

// Obtener IDs de OCA y sanitizarlos
$idOcasArray = isset($_POST['idOcas']) && is_array($_POST['idOcas']) ? $_POST['idOcas'] : null;
$fechaComprasLote = isset($_POST['fechaCompras']) ? trim($_POST['fechaCompras']) : null; // <<< NUEVO: Recibir fechaCompras

if (empty($idOcasArray)) {
    $response['message'] = 'No se proporcionaron IDs de OCA o el formato es incorrecto.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

$idOcasSanitizados = array_map('intval', $idOcasArray);
$idOcasSanitizados = array_filter($idOcasSanitizados, function($id) { return $id > 0; }); // Filtrar IDs no válidos

if (empty($idOcasSanitizados)) {
    $response['message'] = 'IDs de OCA no válidos después de la sanitización.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

// <<< NUEVO: Validar fechaComprasLote si se proporciona (opcional, pero bueno)
if ($fechaComprasLote !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaComprasLote)) {
    $response['message'] = 'Formato de Fecha de Envío a Compras inválido. Use YYYY-MM-DD.';
    echo json_encode($response);
    // $mysqli->close(); // No cerrar aquí si la transacción no ha empezado
    exit;
}

// Iniciar transacción
$mysqli->begin_transaction();

$lote_id = null;
$numero_lote = null;

try {
    // 1. Generar el número de lote (Fecha + Correlativo Diario)
    $fechaActual = date('Y-m-d');

    // Obtener el último correlativo para hoy
    $sqlLastCorrelative = "SELECT correlativoDia FROM lotes_impresion WHERE fechaLote = ? ORDER BY correlativoDia DESC LIMIT 1";
    $stmtLastCorrelative = $mysqli->prepare($sqlLastCorrelative);
    if (!$stmtLastCorrelative) throw new Exception("Error preparando consulta correlativo: " . $mysqli->error);
    $stmtLastCorrelative->bind_param("s", $fechaActual);
    if (!$stmtLastCorrelative->execute()) throw new Exception("Error ejecutando consulta correlativo: " . $stmtLastCorrelative->error);
    $resultLastCorrelative = $stmtLastCorrelative->get_result();
    $lastCorrelative = $resultLastCorrelative->fetch_assoc();
    $stmtLastCorrelative->close();

    $nuevoCorrelativo = ($lastCorrelative ? $lastCorrelative['correlativoDia'] : 0) + 1;
    $numero_lote = $fechaActual . '-' . str_pad($nuevoCorrelativo, 2, '0', STR_PAD_LEFT); // Formato YYYY-MM-DD-NN

    // 2. Insertar el nuevo lote en lotes_impresion
    $sqlInsertLote = "INSERT INTO lotes_impresion (fechaLote, correlativoDia, numeroLote, idUsuarioRegistro) VALUES (?, ?, ?, ?)";
    $stmtInsertLote = $mysqli->prepare($sqlInsertLote);
    if (!$stmtInsertLote) throw new Exception("Error preparando inserción lote: " . $mysqli->error);
    $stmtInsertLote->bind_param("sisi", $fechaActual, $nuevoCorrelativo, $numero_lote, $usuario_id);
    if (!$stmtInsertLote->execute()) {
         // Si falla por UNIQUE constraint (duplicado), intentar de nuevo con el siguiente correlativo
         if ($mysqli->errno == 1062) {
             // Esto es un manejo básico. Para alta concurrencia, se necesitaría un bucle más robusto.
             $nuevoCorrelativo++;
             $numero_lote = $fechaActual . '-' . str_pad($nuevoCorrelativo, 2, '0', STR_PAD_LEFT);
             $stmtInsertLote->bind_param("sisi", $fechaActual, $nuevoCorrelativo, $numero_lote, $usuario_id);
             if (!$stmtInsertLote->execute()) {
                  throw new Exception("Error al ejecutar inserción lote (intento 2): " . $stmtInsertLote->error);
             }
         } else {
             throw new Exception("Error al ejecutar inserción lote: " . $stmtInsertLote->error);
         }
    }
    $lote_id = $mysqli->insert_id;
    $stmtInsertLote->close();

    // 3. Insertar las relaciones en lote_ocas
    $sqlInsertLoteOca = "INSERT INTO lote_ocas (idLote, idOca) VALUES (?, ?)";
    $stmtInsertLoteOca = $mysqli->prepare($sqlInsertLoteOca);
    if (!$stmtInsertLoteOca) throw new Exception("Error preparando inserción lote_ocas: " . $mysqli->error);

    $insertedCount = 0;
    foreach ($idOcasSanitizados as $idOca) {
        $stmtInsertLoteOca->bind_param("ii", $lote_id, $idOca);
        if ($stmtInsertLoteOca->execute()) {
            $insertedCount++;
        } else {
            // Opcional: Loggear errores individuales si una OCA falla
            error_log("Error insertando lote_oca para idOca $idOca en lote $lote_id: " . $stmtInsertLoteOca->error);
            // No lanzamos excepción aquí para no abortar todo si una sola OCA falla
        }
    }
    $stmtInsertLoteOca->close();

    // 4. Actualizar OCAs: Marcar como impresas Y establecer fechaCompras
    if (!empty($idOcasSanitizados)) {
        $updatePlaceholders = implode(',', array_fill(0, count($idOcasSanitizados), '?'));
        
        // Construir la parte SET de la consulta dinámicamente
        $setClauses = ["impresa = 1"];
        $updateParams = []; 
        $updateTypes = "";

        if ($fechaComprasLote !== null) {
            $setClauses[] = "fechaCompras = ?";
            $updateParams[] = $fechaComprasLote; // Añadir fechaCompras al inicio de los parámetros
            $updateTypes .= "s";
        }
        
        // Añadir los IDs de las OCAs a los parámetros
        foreach ($idOcasSanitizados as $idOcaUpdate) {
            $updateParams[] = $idOcaUpdate;
            $updateTypes .= "i";
        }

        $sqlMarcar = "UPDATE control_ocas SET " . implode(', ', $setClauses) . " WHERE idOca IN ($updatePlaceholders)";
        
        $sqlMarcar = "UPDATE control_ocas SET impresa = 1 WHERE idOca IN ($updatePlaceholders) AND impresa = 0";
        $stmtMarcar = $mysqli->prepare($sqlMarcar);
        if ($stmtMarcar) {
            $stmtMarcar->bind_param($updateTypes, ...$idOcasSanitizados);
            if (!$stmtMarcar->execute()) {
                 error_log("Error al ejecutar la consulta para marcar OCAs como impresas (lote $lote_id): " . $stmtMarcar->error);
                 // No lanzamos excepción fatal si falla el marcado
            }
            $stmtMarcar->close();
        } else {
            error_log("Error al preparar la consulta para marcar OCAs como impresas (lote $lote_id): " . $mysqli->error);
        }
    }

    // 5. Confirmar transacción
    $mysqli->commit();

    $response['success'] = true;
    $response['message'] = "Lote de impresión '$numero_lote' creado exitosamente. Se asociaron $insertedCount OCA(s).";
    $response['numeroLote'] = $numero_lote;
    $response['idLote'] = $lote_id; // <<< AÑADIR ESTO

} catch (Exception $e) {
    $mysqli->rollback(); // Revertir cambios en caso de error
    $response['message'] = 'Error al crear el lote de impresión: ' . $e->getMessage();
    error_log("Error en crearLoteImpresion.php: " . $e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>