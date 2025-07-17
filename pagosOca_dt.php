<?php
// pagosOca_dt.php

 error_reporting(E_ALL); // Descomentar solo para desarrollo
 ini_set('display_errors', 1); // Descomentar solo para desarrollo
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

// --- Parámetros de DataTables y Personalizados ---
$draw = isset($_GET['draw']) ? intval($_GET['draw']) : 0;
$start = isset($_GET['start']) ? intval($_GET['start']) : 0;
$length = isset($_GET['length']) ? intval($_GET['length']) : 10;
$orderColumnIndex = isset($_GET['order'][0]['column']) ? intval($_GET['order'][0]['column']) : 0;
$orderDir = isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'desc' ? 'DESC' : 'ASC';

// Búsqueda personalizada (desde el input en pagosOca.php)
$searchOca = isset($_GET['searchOca']) ? $mysqli->real_escape_string(trim($_GET['searchOca'])) : '';

// --- Mapeo de Columnas para Ordenamiento ---
// Índice debe coincidir con el orden en JS
$columnMap = [
    0 => 'proyectoDesc', // Usaremos un alias o concatenación para el proyecto
    1 => 'co.oca',
    2 => 'co.montoTotal',
    3 => 'montoPagado' // Usaremos un alias para la suma
    // 4 es Acciones - no se ordena
];
$orderColumnName = $columnMap[$orderColumnIndex] ?? $columnMap[0];

// --- Construir Consulta SQL Base ---
// Usamos CONCAT para el proyecto y una subconsulta para el monto pagado (más eficiente que N+1)
$baseSql = " FROM control_ocas co
             INNER JOIN proyectos p ON co.idProyecto = p.idProyecto ";

// --- Construir Cláusula WHERE ---
$whereSql = "";
$params = [];
$types = "";

if (!empty($searchOca)) {
    $whereSql .= " WHERE co.oca LIKE ? ";
    $params[] = "%" . $searchOca . "%";
    $types .= "s";
}

// --- Contar Total de Registros (Sin Filtros) ---
$totalRecordsSql = "SELECT COUNT(co.idOca) as total " . $baseSql;
$totalResult = $mysqli->query($totalRecordsSql);
$totalRecords = $totalResult ? $totalResult->fetch_assoc()['total'] : 0;
if($totalResult) $totalResult->free();

// --- Contar Total de Registros Filtrados ---
$filteredRecordsSql = "SELECT COUNT(co.idOca) as total " . $baseSql . $whereSql;
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
    } else { error_log("Error ejecutando conteo filtrado en pagosOca_dt.php: " . $stmtFiltered->error); }
    $stmtFiltered->close();
} else { error_log("Error preparando conteo filtrado en pagosOca_dt.php: " . $mysqli->error); }


// --- Construir Consulta Principal para Obtener Datos ---
$dataSql = "SELECT
                co.idOca, -- *** AÑADIR ESTA LÍNEA ***
                CONCAT(p.codigoProyecto, ' ', p.municipio) AS proyectoDesc, -- Concatenamos para mostrar
                co.oca,
                co.montoTotal,
                (SELECT SUM(cp.montoParcial) FROM control_pagos cp WHERE cp.idOca = co.idOca) AS montoPagado
            " . $baseSql . $whereSql
            . " ORDER BY " . $orderColumnName . " " . $orderDir
            . " LIMIT ?, ?";

// --- Preparar y Ejecutar Consulta Principal ---
$stmtData = $mysqli->prepare($dataSql);
$data = [];

if ($stmtData) {
    // Añadir parámetros de LIMIT
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
                // Asegurar que montoPagado sea 0 si es NULL
                $row['montoPagado'] = $row['montoPagado'] ?? 0;
                $data[] = $row;
            }
            $resultData->free();
        } else { error_log("Error obteniendo resultados de datos en pagosOca_dt.php: " . $mysqli->error); }
    } else { error_log("Error ejecutando consulta de datos en pagosOca_dt.php: " . $stmtData->error); }
    $stmtData->close();
} else { error_log("Error preparando consulta de datos en pagosOca_dt.php: " . $mysqli->error . " SQL: " . $dataSql); }

// --- Cerrar Conexión ---
$mysqli->close();

// --- Construir y Enviar Respuesta JSON ---
$response = [
    "draw" => $draw,
    "recordsTotal" => $totalRecords,
    "recordsFiltered" => $totalFiltered,
    "data" => $data
];

echo json_encode($response);
?>
