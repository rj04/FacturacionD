<?php
// listarOcas_dt.php
// error_reporting(E_ALL); // Descomentar solo para desarrollo
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

// Búsqueda personalizada (desde el input en listarOcas.php)
$searchOca = isset($_GET['searchOca']) ? $mysqli->real_escape_string(trim($_GET['searchOca'])) : '';
$filtroImpresas = isset($_GET['filtro_impresas']) ? $_GET['filtro_impresas'] : 'no_impresas'; // 'no_impresas', 'solo_impresas', 'todas'

// --- Mapeo de Columnas para Ordenamiento ---
// Índice debe coincidir con el orden en JS
// JS Col 0 (Checkbox) y JS Col 10 (Acciones) no son ordenables desde el backend por DataTables.
$columnMap = [
    1 => 'p.codigoProyecto',    // JS Col 1 (Proyecto) -> Mapeado a proyectoDesc en SELECT
    2 => 'co.oca',              // JS Col 2 (OCA Completa) -> Mapeado a oca_completa en SELECT
    3 => 'co.proceso_dom',      // JS Col 3 (Proceso DOM)
    4 => 'prov.proveedor',      // JS Col 4 (Proveedor) -> Mapeado a proveedor_nombre en SELECT
    5 => 'co.valor_oca',        // JS Col 5 (Valor OCA)
    6 => 'co.numero_factura',   // JS Col 6 (N° Factura)
    7 => 'co.total_factura',    // JS Col 7 (Total Factura)
    8 => 'co.fechaCompras',     // JS Col 8 (Fecha Compras) -> Mapeado a fecha_compras_formateada en SELECT
    9 => 'co.impresa',          // JS Col 9 (Estado impresión)
];
  
$orderColumnName = $columnMap[$orderColumnIndex] ?? $columnMap[1]; // Default a ordenar por Proyecto si el índice no es válido

// --- Construir Consulta SQL Base ---
$baseSql = " FROM control_ocas co
             LEFT JOIN proyectos p ON co.idProyecto = p.idProyecto
             LEFT JOIN proveedores prov ON co.idProveedor = prov.idProveedor
             LEFT JOIN usuarios usr ON co.idUsuario_registro = usr.idUsuario ";


// --- Construir Cláusula WHERE ---
$whereSql = "";
$params = [];
$types = "";

if (!empty($searchOca)) {
    // Buscar en varias columnas relevantes para el módulo de facturación
    $whereSql .= " WHERE (";
    $searchableColumns = [
        'p.codigoProyecto', // Buscar por código de proyecto
        'co.oca_numero',
        'co.anio_oca',
        'co.proceso_dom',
        'prov.proveedor', // Nombre del proveedor (Corregido)
        'co.numero_factura',
        'co.numero_acta',
        'usr.nombre',    // Nombre del usuario que registró
        'co.fechaCompras' // Buscar por fecha de compras
    ];    
    $first = true;
    foreach ($searchableColumns as $col) {
        if (!$first) $whereSql .= " OR ";
        $whereSql .= " LOWER($col) LIKE LOWER(?) ";
        $params[] = "%" . $searchOca . "%";
        $types .= "s";
        $first = false;
    }
    $whereSql .= ") ";
}

// Aplicar filtro de estado de impresión
if ($filtroImpresas === 'no_impresas') {
    $whereSql .= (empty($whereSql) ? " WHERE " : " AND ") . "co.impresa = 0 ";
} elseif ($filtroImpresas === 'solo_impresas') {
    $whereSql .= (empty($whereSql) ? " WHERE " : " AND ") . "co.impresa = 1 ";
}
// Si es 'todas', no se añade condición para co.impresa



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
    } else { error_log("Error ejecutando conteo filtrado en listarOcas_dt.php: " . $stmtFiltered->error); }
    $stmtFiltered->close();
} else { error_log("Error preparando conteo filtrado en listarOcas_dt.php: " . $mysqli->error); }


// --- Construir Consulta Principal para Obtener Datos ---
$dataSql = "SELECT
                co.idOca, -- Esencial para los botones de acción
                p.codigoProyecto AS proyectoDesc, -- Campo que DataTables está esperando
                co.oca AS oca_completa,
                co.proceso_dom,                
                prov.proveedor AS proveedor_nombre, -- Corregido: usar prov.proveedor
                co.valor_oca,
                co.numero_acta,
                co.fecha_factura,
                co.numero_factura,
                co.monto_factura,
                co.iva_retenido_factura,
                co.total_factura,
                usr.nombre AS usuario_registro_nombre, -- Asumiendo que la columna en 'usuarios' es 'nombre'
                DATE_FORMAT(co.fechaCompras, '%d/%m/%Y') AS fecha_compras_formateada, -- Nuevo campo formateado
                co.impresa -- Devolver el estado de impresión
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
                // Asegurar valores por defecto para evitar errores en JS si son NULL
                
                $row['proveedor_nombre'] = $row['proveedor_nombre'] ?? 'N/A';
                $row['fecha_compras_formateada'] = $row['fecha_compras_formateada'] ?? 'N/A'; // Nuevo
                $row['usuario_registro_nombre'] = $row['usuario_registro_nombre'] ?? 'N/A';
                $row['impresa'] = (int)$row['impresa']; // Asegurar que sea entero para JS
                $data[] = $row;
            }
            $resultData->free();
        } else { error_log("Error obteniendo resultados de datos en listarOcas_dt.php: " . $mysqli->error); }
    } else { error_log("Error ejecutando consulta de datos en listarOcas_dt.php: " . $stmtData->error); }
    $stmtData->close();
} else { error_log("Error preparando consulta de datos en listarOcas_dt.php: " . $mysqli->error . " SQL: " . $dataSql); }

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
