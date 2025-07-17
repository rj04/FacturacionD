<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
header('Content-Type: application/json');

include_once "helpers.php";
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('view_print_batches')) {
    echo json_encode(["draw" => 0, "recordsTotal" => 0, "recordsFiltered" => 0, "data" => [], "error" => "Acceso denegado."]);
    exit;
}

$mysqli = include_once "conexion.php";
if ($mysqli->connect_error) {
    echo json_encode(["draw" => 0, "recordsTotal" => 0, "recordsFiltered" => 0, "data" => [], "error" => "DB Connection Error"]);
    exit;
}

$draw = isset($_GET['draw']) ? intval($_GET['draw']) : 0;
$start = isset($_GET['start']) ? intval($_GET['start']) : 0;
$length = isset($_GET['length']) ? intval($_GET['length']) : 10;
$searchValue = isset($_GET['search']['value']) ? $mysqli->real_escape_string(trim($_GET['search']['value'])) : '';

$orderColumnIndex = isset($_GET['order'][0]['column']) ? intval($_GET['order'][0]['column']) : 4; // Default a fechaRegistro
$orderDir = isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'asc' ? 'ASC' : 'DESC';

$columnMap = [
    0 => 'li.numeroLote',
    1 => 'li.fechaLote',
    2 => 'li.correlativoDia',
    3 => 'u.nombre',
    4 => 'li.fechaRegistro',
    // 5 (cantidad_ocas) no es directamente ordenable desde la DB sin subconsultas más complejas en el ORDER BY
];
$orderColumnName = $columnMap[$orderColumnIndex] ?? $columnMap[4];

$baseSql = " FROM lotes_impresion li LEFT JOIN usuarios u ON li.idUsuarioRegistro = u.idUsuario ";
$whereSql = "";
$params = [];
$types = "";

if (!empty($searchValue)) {
    $whereSql = " WHERE (LOWER(li.numeroLote) LIKE LOWER(?) OR LOWER(u.nombre) LIKE LOWER(?) OR DATE_FORMAT(li.fechaLote, '%d/%m/%Y') LIKE ? OR DATE_FORMAT(li.fechaRegistro, '%d/%m/%Y %H:%i') LIKE ?)";
    $searchPattern = "%" . $searchValue . "%";
    $params = [$searchPattern, $searchPattern, $searchPattern, $searchPattern];
    $types = "ssss";
}

// Total records
$totalRecordsSql = "SELECT COUNT(li.idLote) as total " . $baseSql;
$totalResult = $mysqli->query($totalRecordsSql);
$totalRecords = $totalResult ? $totalResult->fetch_assoc()['total'] : 0;
if($totalResult) $totalResult->free();

// Filtered records
$filteredRecordsSql = "SELECT COUNT(li.idLote) as total " . $baseSql . $whereSql;
$stmtFiltered = $mysqli->prepare($filteredRecordsSql);
$totalFiltered = 0;
if ($stmtFiltered) {
    if (!empty($params)) $stmtFiltered->bind_param($types, ...$params);
    if ($stmtFiltered->execute()) {
        $resultFiltered = $stmtFiltered->get_result();
        $totalFiltered = $resultFiltered ? $resultFiltered->fetch_assoc()['total'] : 0;
        if($resultFiltered) $resultFiltered->free();
    } else { error_log("Error ejecutando conteo filtrado en listarLotes_dt.php: " . $stmtFiltered->error); }
    $stmtFiltered->close();
} else {
    error_log("Error preparando conteo filtrado en listarLotes_dt.php: " . $mysqli->error);
    $totalFiltered = $totalRecords;
}

// Data
$dataSql = "SELECT
                li.idLote,
                li.numeroLote,
                DATE_FORMAT(li.fechaLote, '%d/%m/%Y') AS fechaLoteFormateada,
                li.correlativoDia,
                u.nombre AS usuario_nombre,
                DATE_FORMAT(li.fechaRegistro, '%d/%m/%Y %H:%i:%s') AS fechaRegistroFormateada,
                (SELECT COUNT(lo.idOca) FROM lote_ocas lo WHERE lo.idLote = li.idLote) AS cantidad_ocas
            " . $baseSql . $whereSql
            . " ORDER BY " . $orderColumnName . " " . $orderDir
            . " LIMIT ?, ?";

$stmtData = $mysqli->prepare($dataSql);
$data = [];

if ($stmtData) {
    $finalParams = $params;
    $finalTypes = $types;
    $finalParams[] = $start;
    $finalTypes .= "i";
    $finalParams[] = $length;
    $finalTypes .= "i";

    if (!empty($finalParams)) {
        $stmtData->bind_param($finalTypes, ...$finalParams);
    }

    if ($stmtData->execute()) {
        $resultData = $stmtData->get_result();
        if ($resultData) {
            while ($row = $resultData->fetch_assoc()) {
                $row['usuario_nombre'] = $row['usuario_nombre'] ?? 'N/A';
                $data[] = $row;
            }
            $resultData->free();
        } else { error_log("Error obteniendo resultados de datos en listarLotes_dt.php: " . $mysqli->error); }
    } else { error_log("Error ejecutando consulta de datos en listarLotes_dt.php: " . $stmtData->error); }
    $stmtData->close();
} else { error_log("Error preparando consulta de datos en listarLotes_dt.php: " . $mysqli->error . " SQL: " . $dataSql); }

$mysqli->close();

$response = [
    "draw" => $draw,
    "recordsTotal" => $totalRecords,
    "recordsFiltered" => $totalFiltered,
    "data" => $data
];

echo json_encode($response);
?>