<?php
// c:\UniServerZ\www\inventario-test\listarBodegueros_dt.php

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
$start = isset($_GET['start']) ? intval($_GET['start']) : 0; // Offset
$length = isset($_GET['length']) ? intval($_GET['length']) : 10; // Limit
$orderColumnIndex = isset($_GET['order'][0]['column']) ? intval($_GET['order'][0]['column']) : 1; // Ordenar por bodeguero por defecto
$orderDir = isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'desc' ? 'DESC' : 'ASC';
// $searchValue = isset($_GET['search']['value']) ? $mysqli->real_escape_string(trim($_GET['search']['value'])) : ''; // Búsqueda global (ya no la usamos directamente)
// *** Leer el parámetro de búsqueda personalizada ***
$customSearchValue = isset($_GET['customSearch']) ? $mysqli->real_escape_string(trim($_GET['customSearch'])) : '';

// --- Mapeo de Columnas para Ordenamiento ---
$columnMap = [
    0 => 'idBodeguero',
    1 => 'bodeguero',
    2 => 'telefono',
    // 3 es Acciones, no ordenable
];
$orderColumnName = $columnMap[$orderColumnIndex] ?? $columnMap[1]; // Columna por defecto

// --- Construir Consulta SQL Base ---
$baseSql = " FROM bodegueros ";

// --- Construir Cláusula WHERE Dinámicamente ---
$whereSql = "";
$params = []; // Array para los parámetros de bind_param
$types = "";  // String para los tipos de bind_param

// *** Aplicar filtro personalizado ***
if (!empty($customSearchValue)) {
    $whereSql = " WHERE (LOWER(bodeguero) LIKE LOWER(?) OR LOWER(telefono) LIKE LOWER(?)) ";
    $params[] = "%" . $customSearchValue . "%"; // Usar el valor personalizado
    $params[] = "%" . $customSearchValue . "%"; // Usar el valor personalizado
    $types .= "ss";
}

// --- Contar Total de Registros (Sin Filtros) ---
$totalRecordsSql = "SELECT COUNT(idBodeguero) as total " . $baseSql;
$totalResult = $mysqli->query($totalRecordsSql);
$totalRecords = $totalResult ? $totalResult->fetch_assoc()['total'] : 0;
if($totalResult) $totalResult->free();

// --- Contar Total de Registros Filtrados ---
$filteredRecordsSql = "SELECT COUNT(idBodeguero) as total " . $baseSql . $whereSql;
$stmtFiltered = $mysqli->prepare($filteredRecordsSql);
$totalFiltered = 0;
if ($stmtFiltered) {
    if (!empty($params)) {
        $stmtFiltered->bind_param($types, ...$params);
    }
    if ($stmtFiltered->execute()) {
        $resultFiltered = $stmtFiltered->get_result();
        $totalFiltered = $resultFiltered ? $resultFiltered->fetch_assoc()['total'] : 0;
        if($resultFiltered) $resultFiltered->free();
    } else { error_log("Error ejecutando conteo filtrado en listarBodegueros_dt.php: " . $stmtFiltered->error); }
    $stmtFiltered->close();
} else { error_log("Error preparando conteo filtrado en listarBodegueros_dt.php: " . $mysqli->error); }

// --- Construir Consulta Principal para Obtener Datos ---
$dataSql = "SELECT idBodeguero, bodeguero, telefono " . $baseSql . $whereSql
         . " ORDER BY " . $orderColumnName . " " . $orderDir
         . " LIMIT ?, ?";

// --- Preparar y Ejecutar Consulta Principal ---
$stmtData = $mysqli->prepare($dataSql);
$data = [];
if ($stmtData) {
    $finalParams = $params; $finalTypes = $types;
    $finalParams[] = $start; $finalTypes .= "i";
    $finalParams[] = $length; $finalTypes .= "i";
    if (!empty($finalParams)) { $stmtData->bind_param($finalTypes, ...$finalParams); }
    if ($stmtData->execute()) {
        $resultData = $stmtData->get_result();
        if ($resultData) { $data = $resultData->fetch_all(MYSQLI_ASSOC); $resultData->free(); }
        else { error_log("Error obteniendo resultados de datos en listarBodegueros_dt.php: " . $mysqli->error); }
    } else { error_log("Error ejecutando consulta de datos en listarBodegueros_dt.php: " . $stmtData->error); }
    $stmtData->close();
} else { error_log("Error preparando consulta de datos en listarBodegueros_dt.php: " . $mysqli->error); }

$mysqli->close();

// --- Construir y Enviar Respuesta JSON ---
$response = ["draw" => $draw, "recordsTotal" => $totalRecords, "recordsFiltered" => $totalFiltered, "data" => $data];
echo json_encode($response);
?>