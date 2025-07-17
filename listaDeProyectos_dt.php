<?php
// c:\UniServerZ\www\facturacion\listaDeProyectos_dt.php

// Mostrar errores (opcional para desarrollo)
// error_reporting(E_ALL);
// ini_set('display_errors', 1);

header('Content-Type: application/json'); // Indicar que la respuesta es JSON

// Asegúrate de que la sesión esté iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

include_once "helpers.php"; // Para la función usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('manage_projects')) {
    echo json_encode([ "draw" => isset($_GET['draw']) ? intval($_GET['draw']) : 0, "recordsTotal" => 0, "recordsFiltered" => 0, "data" => [], "error" => "Acceso denegado."]);
    exit;
}
// --- Fin Control de Acceso ---


$mysqli = include_once "conexion.php";

// --- Parámetros de DataTables ---
$draw = isset($_GET['draw']) ? intval($_GET['draw']) : 0;
$start = isset($_GET['start']) ? intval($_GET['start']) : 0; // Offset
$length = isset($_GET['length']) ? intval($_GET['length']) : 10; // Limit
$searchValue = isset($_GET['search']['value']) ? $mysqli->real_escape_string(trim($_GET['search']['value'])) : ''; // Búsqueda global

if (!$mysqli || $mysqli->connect_error) {
    echo json_encode([
        "draw" => $draw,
        "recordsTotal" => 0,
        "recordsFiltered" => 0,
        "data" => [],
        "error" => "Error de conexión a la base de datos: " . ($mysqli ? $mysqli->connect_error : "No se pudo inicializar MySQLi.")
    ]);
    exit;
}

// --- Mapeo de columnas para ordenamiento ---
// El índice debe coincidir con el orden de las columnas en el HTML/JS
$columnasOrden = [
    0 => 'p.codigoProyecto',
    1 => 'p.municipio',
    2 => 'p.nombreProyecto',
    3 => 'r.residente',
    4 => 'r.telefono', // telefonoR
    5 => 'b.bodeguero',
    6 => 'b.telefono', // telefonoB
    7 => 'p.zona',
    8 => 'p.status',
    // 9 es Acciones, no ordenable desde DB
];

$orderByColumnIndex = isset($_GET['order'][0]['column']) ? intval($_GET['order'][0]['column']) : 0;
// Asegurarse de que el índice de columna exista en el mapeo y sea ordenable
if (!array_key_exists($orderByColumnIndex, $columnasOrden)) {
     $orderByColumnIndex = 0; // Default a la primera columna si es inválido
}
$orderByColumn = $columnasOrden[$orderByColumnIndex];
$orderDir = isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'desc' ? 'DESC' : 'ASC';

// --- Construcción de la consulta SQL ---
$sqlBase = " FROM proyectos p
             LEFT JOIN residentes r ON p.idResidente = r.idResidente
             LEFT JOIN bodegueros b ON p.idBodeguero = b.idBodeguero ";

// Condición base (excluir proyectos sin nombre si es necesario, como en la consulta original)
$sqlWhereBase = " WHERE p.nombreProyecto <> '' "; // Mantener la condición original

$sqlWhere = "";
$params = [];
$types = "";

// Condición de búsqueda global de DataTables
if (!empty($searchValue)) {
    $searchCondition = " AND (";
    // Columnas donde buscar
    $searchableColumns = [
        'p.codigoProyecto',
        'p.municipio',
        'p.nombreProyecto',
        'r.residente',
        'r.telefono', // Buscar en telefonoR
        'b.bodeguero',
        'b.telefono', // Buscar en telefonoB
        'p.zona',
        'p.status'
    ];
    $first = true;
    foreach ($searchableColumns as $col) {
        if (!$first) {
            $searchCondition .= " OR ";
        }
        // Usar LOWER() para búsqueda insensible a mayúsculas/minúsculas si la collation no lo es
        $searchCondition .= "LOWER($col) LIKE LOWER(?)";
        $params[] = "%" . $searchValue . "%";
        $types .= "s";
        $first = false;
    }
    $searchCondition .= ") ";
    $sqlWhere .= $searchCondition;
}

// --- Consulta para conteo total (con condición base) ---
$sqlTotal = "SELECT COUNT(p.idProyecto) as total " . $sqlBase . $sqlWhereBase;
$resultTotal = $mysqli->query($sqlTotal);
$totalRecords = $resultTotal ? $resultTotal->fetch_assoc()['total'] : 0;
if($resultTotal) $resultTotal->free();

// --- Consulta para conteo filtrado ---
$sqlFilteredQuery = "SELECT COUNT(p.idProyecto) as total " . $sqlBase . $sqlWhereBase . $sqlWhere;
$stmtFiltered = $mysqli->prepare($sqlFilteredQuery);
$totalFiltered = 0;
if ($stmtFiltered) {
    if (!empty($params)) {
        $stmtFiltered->bind_param($types, ...$params);
    }
    if ($stmtFiltered->execute()) {
        $resultFiltered = $stmtFiltered->get_result();
        $rowFiltered = $resultFiltered->fetch_assoc();
        $totalFiltered = $rowFiltered ? $rowFiltered['total'] : 0;
        $resultFiltered->free();
    } else {
        error_log("Error ejecutando conteo filtrado: " . $stmtFiltered->error);
    }
    $stmtFiltered->close();
} else {
     error_log("Error preparando conteo filtrado: " . $mysqli->error . " SQL: " . $sqlFilteredQuery);
     $totalFiltered = $totalRecords; // Fallback a total si falla la preparación
}


// --- Consulta para obtener los datos paginados y ordenados ---
$sqlDataQuery = "SELECT
                    p.idProyecto, p.codigoProyecto, p.municipio, p.nombreProyecto, p.status, p.zona,
                    r.residente, r.telefono AS telefonoR,
                    b.bodeguero, b.telefono AS telefonoB "
                . $sqlBase
                . $sqlWhereBase . $sqlWhere // Aplicar filtros
                . " ORDER BY " . $orderByColumn . " " . $orderDir // Aplicar orden
                . " LIMIT ?, ?"; // Aplicar paginación

// Añadir parámetros de LIMIT a $params y $types
$params[] = $start;
$types .= "i";
$params[] = $length;
$types .= "i";

$stmtData = $mysqli->prepare($sqlDataQuery);
$data = [];

if ($stmtData) {
    // $params y $types ya contienen los parámetros de búsqueda (si los hay)
    // y los parámetros de LIMIT ($start, $length) que se añadieron justo antes.
    // No es necesario reconstruir $dataParams y $dataTypes como se hacía antes.
    // Solo necesitamos asegurarnos de que $params no esté vacío si vamos a llamar a bind_param.
    // Dado que $start y $length siempre se añaden, $params nunca estará vacío en este punto
    // si la consulta SQL incluye LIMIT ?, ? (que sí lo hace).
    if (!empty($params)) {
        $stmtData->bind_param($types, ...$params);
    }
    if ($stmtData->execute()) {
        $resultData = $stmtData->get_result();
        if ($resultData) {
            // Fetch_all es más eficiente si la memoria no es problema
            $data = $resultData->fetch_all(MYSQLI_ASSOC);
            foreach ($data as $key => $row) {
                $data[$key]['residente'] = $row['residente'] ?? 'N/A';
                $data[$key]['telefonoR'] = $row['telefonoR'] ?? 'N/A';
                $data[$key]['bodeguero'] = $row['bodeguero'] ?? 'N/A';
                $data[$key]['telefonoB'] = $row['telefonoB'] ?? 'N/A';
            }
                            
            $resultData->free();
        } else {
             error_log("Error obteniendo resultados de datos: " . $mysqli->error);
        }
    } else {
        error_log("Error ejecutando consulta de datos: " . $stmtData->error);
    }
    $stmtData->close();
} else {
    error_log("Error preparando consulta de datos: " . $mysqli->error . " SQL: " . $sqlDataQuery);
}

$mysqli->close();

// --- Respuesta JSON para DataTables ---
$response = [
    "draw" => $draw,
    "recordsTotal" => $totalRecords,
    "recordsFiltered" => $totalFiltered,
    "data" => $data,
    // --- Depuración (opcional) ---
    // "debug_sql_data" => $sqlDataQuery,
    // "debug_sql_filtered_count" => $sqlFilteredQuery,
    // "debug_params" => $dataParams ?? $params, // Mostrar los parámetros usados en la consulta de datos
    // "debug_types" => $dataTypes ?? $types,
    // "error_mysqli_stmt_data" => $stmtData ? $stmtData->error : "StmtData preparation failed",
    // "error_mysqli_stmt_filtered" => $stmtFiltered ? $stmtFiltered->error : "StmtFiltered preparation failed",
    // "error_mysqli_general" => $mysqli->error
];

echo json_encode($response);
?>
