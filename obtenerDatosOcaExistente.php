<?php
// c:\UniServerZ\www\facturacion\obtenerDatosOcaExistente.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$response = ['success' => false, 'oca_encontrada' => false, 'oca_data' => null, 'message' => 'Error desconocido.'];
$mysqli = include_once "conexion.php";

if ($mysqli->connect_error) {
    $response['message'] = "Error de conexión a la base de datos: " . $mysqli->connect_error;
    echo json_encode($response);
    exit;
}

$oca_numero = isset($_GET['oca_numero']) ? trim($_GET['oca_numero']) : null;
$anio_oca = isset($_GET['anio_oca']) ? filter_input(INPUT_GET, 'anio_oca', FILTER_VALIDATE_INT) : null;

if (empty($oca_numero) || $anio_oca === null) {
    $response['message'] = 'Número de OCA o Año no proporcionados o inválidos.';
    echo json_encode($response);
    $mysqli->close();
    exit;
}

try {
    $stmt = $mysqli->prepare("
        SELECT 
            co.*, 
            p.nombreProyecto AS nombre_proyecto, 
            p.codigoProyecto AS codigo_proyecto,
            prov.proveedor AS nombre_proveedor
        FROM control_ocas co
        LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
        LEFT JOIN proveedores prov ON co.idProveedor = prov.idProveedor
        WHERE co.oca_numero = ? AND co.anio_oca = ? 
        LIMIT 1
    ");
    if (!$stmt) {
        throw new Exception("Error preparando la consulta: " . $mysqli->error);
    }

    $stmt->bind_param("si", $oca_numero, $anio_oca);
    if (!$stmt->execute()) {
        throw new Exception("Error ejecutando la consulta: " . $stmt->error);
    }

    $result = $stmt->get_result();
    $oca_data = $result->fetch_assoc();

    $response['success'] = true;
    if ($oca_data) {
        $response['oca_encontrada'] = true;

        // Obtener la última acta registrada para esta combinación oca_numero y anio_oca
        $stmtUltimaActa = $mysqli->prepare("
            SELECT numero_acta 
            FROM control_ocas 
            WHERE oca_numero = ? AND anio_oca = ? AND numero_acta IS NOT NULL AND numero_acta <> ''
            ORDER BY idOca DESC 
            LIMIT 1
        ");
        if ($stmtUltimaActa) {
            $stmtUltimaActa->bind_param("si", $oca_numero, $anio_oca);
            $stmtUltimaActa->execute();
            $resultUltimaActa = $stmtUltimaActa->get_result();
            $ultimaActaRow = $resultUltimaActa->fetch_assoc();
            $response['ultima_acta_registrada'] = $ultimaActaRow ? $ultimaActaRow['numero_acta'] : null;
            $stmtUltimaActa->close();
        }

        // Eliminar campos no deseados
        unset($oca_data['numero_acta']);
        unset($oca_data['fecha_factura']);
        unset($oca_data['numero_factura']);
        unset($oca_data['monto_factura']);
        unset($oca_data['iva_retenido_factura']);
        unset($oca_data['total_factura']);
        unset($oca_data['total_factura_letras']);
        // proceso_dom y proceso_numero se mantienen si existen en $oca_data (por co.*)
        // y serán usados para poblar los campos de proceso.


        // Formatear fechaCompras a YYYY-MM-DD si no es NULL
        if (!empty($oca_data['fechaCompras']) && $oca_data['fechaCompras'] != '0000-00-00') {
            $oca_data['fechaCompras'] = date('Y-m-d', strtotime($oca_data['fechaCompras']));
        } else {
            $oca_data['fechaCompras'] = null;
        }
        $response['oca_data'] = $oca_data;
        $response['message'] = 'Datos de la OCA obtenidos.';
    } else {
        $response['oca_encontrada'] = false;
        // Incluso si no se encuentra la OCA, podríamos buscar la última acta para la combinación
        $response['message'] = 'No se encontró ninguna OCA para el número y año especificados.';
    }
    $stmt->close();
} catch (Exception $e) {
    $response['message'] = "Error al obtener datos de la OCA: " . $e->getMessage();
    error_log("Error en obtenerDatosOcaExistente.php: " . $e->getMessage());
}

$mysqli->close();
echo json_encode($response);
?>