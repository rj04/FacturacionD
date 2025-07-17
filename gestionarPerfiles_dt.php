<?php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";

// Verificar conexión
if ($mysqli->connect_error) {
    echo json_encode([
        "draw" => isset($_GET['draw']) ? intval($_GET['draw']) : 0,
        "recordsTotal" => 0,
        "recordsFiltered" => 0,
        "data" => [],
        "error" => "Error de conexión a la base de datos: " . $mysqli->connect_error
    ]);
    exit;
}

// --- Parámetros de DataTables ---
$draw = isset($_GET['draw']) ? intval($_GET['draw']) : 0;
$start = isset($_GET['start']) ? intval($_GET['start']) : 0;
$length = isset($_GET['length']) ? intval($_GET['length']) : 10;
$orderColumnIndex = isset($_GET['order'][0]['column']) ? intval($_GET['order'][0]['column']) : 1;
$orderDir = isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'desc' ? 'DESC' : 'ASC';
$searchValue = isset($_GET['search']['value']) ? $mysqli->real_escape_string(trim($_GET['search']['value'])) : '';

// --- Mapeo de Columnas para Ordenamiento ---
$columnMap = [
    0 => 'idPerfil',
    1 => 'perfil',
    // 2 es Acciones, no ordenable
];
$orderColumnName = $columnMap[$orderColumnIndex] ?? $columnMap[1];

// --- Construir Consulta SQL Base ---
$baseSql = " FROM perfiles ";

// --- Construir Cláusula WHERE ---
$whereSql = "";
$params = [];
$types = "";

if (!empty($searchValue)) {
    $whereSql = " WHERE LOWER(perfil) LIKE LOWER(?) ";
    $params[] = "%" . $searchValue . "%";
    $types .= "s";
}

// --- Contar Total de Registros ---
$totalRecordsSql = "SELECT COUNT(idPerfil) as total " . $baseSql;
$totalResult = $mysqli->query($totalRecordsSql);
$totalRecords = $totalResult ? $totalResult->fetch_assoc()['total'] : 0;
if($totalResult) $totalResult->free();

// --- Contar Total Filtrado ---
$filteredRecordsSql = "SELECT COUNT(idPerfil) as total " . $baseSql . $whereSql;
$stmtFiltered = $mysqli->prepare($filteredRecordsSql);
$totalFiltered = 0;
if ($stmtFiltered) {
    if (!empty($params)) $stmtFiltered->bind_param($types, ...$params);
    if ($stmtFiltered->execute()) {
        $resultFiltered = $stmtFiltered->get_result();
        $totalFiltered = $resultFiltered ? $resultFiltered->fetch_assoc()['total'] : 0;
        if($resultFiltered) $resultFiltered->free();
    }
    $stmtFiltered->close();
} else { $totalFiltered = $totalRecords; }

// --- Obtener Datos Paginados ---
$dataSql = "SELECT idPerfil, perfil " . $baseSql . $whereSql
         . " ORDER BY " . $orderColumnName . " " . $orderDir
         . " LIMIT ?, ?";

$stmtData = $mysqli->prepare($dataSql);
$data = [];
if ($stmtData) {
    $finalParams = $params; $finalTypes = $types;
    $finalParams[] = $start; $finalTypes .= "i";
    $finalParams[] = $length; $finalTypes .= "i";
    if (!empty($finalParams)) $stmtData->bind_param($finalTypes, ...$finalParams);
    if ($stmtData->execute()) {
        $resultData = $stmtData->get_result();
        if ($resultData) { $data = $resultData->fetch_all(MYSQLI_ASSOC); $resultData->free(); }
    }
    $stmtData->close();
}

$mysqli->close();

// --- Respuesta JSON ---
$response = ["draw" => $draw, "recordsTotal" => $totalRecords, "recordsFiltered" => $totalFiltered, "data" => $data];
echo json_encode($response);
?>