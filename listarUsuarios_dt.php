<?php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";

if ($mysqli->connect_error) {
    echo json_encode(["draw" => 0, "recordsTotal" => 0, "recordsFiltered" => 0, "data" => [], "error" => "DB Connection Error"]);
    exit;
}

$draw = isset($_GET['draw']) ? intval($_GET['draw']) : 0;
$start = isset($_GET['start']) ? intval($_GET['start']) : 0;
$length = isset($_GET['length']) ? intval($_GET['length']) : 10;
$orderColumnIndex = isset($_GET['order'][0]['column']) ? intval($_GET['order'][0]['column']) : 1;
$orderDir = isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'desc' ? 'DESC' : 'ASC';
// $searchValue = isset($_GET['search']['value']) ? $mysqli->real_escape_string(trim($_GET['search']['value'])) : ''; // Ya no se usa directamente
$customSearchValue = isset($_GET['customSearch']) ? $mysqli->real_escape_string(trim($_GET['customSearch'])) : ''; // Leer el nuevo parámetro
$columnMap = [
    0 => 'u.idUsuario',
    1 => 'u.nombre',
    2 => 'u.usuario',
    3 => 'p.perfil',
];
$orderColumnName = $columnMap[$orderColumnIndex] ?? $columnMap[1];

$baseSql = " FROM usuarios u JOIN perfiles p ON u.idPerfil = p.idPerfil ";
$whereSql = "";
$params = [];
$types = "";

if (!empty($customSearchValue)) { // Usar el nuevo valor
    $whereSql = " WHERE (LOWER(u.nombre) LIKE LOWER(?) OR LOWER(u.usuario) LIKE LOWER(?) OR LOWER(p.perfil) LIKE LOWER(?)) "; // Buscar en nombre, usuario y perfil
    $searchPattern = "%" . $customSearchValue . "%"; // Usar el nuevo valor
    $params = [$searchPattern, $searchPattern, $searchPattern];
    $types = "sss";
}
// Total records
$totalRecordsSql = "SELECT COUNT(u.idUsuario) as total " . $baseSql;
$totalResult = $mysqli->query($totalRecordsSql);
$totalRecords = $totalResult ? $totalResult->fetch_assoc()['total'] : 0;
if($totalResult) $totalResult->free();

// Filtered records
$filteredRecordsSql = "SELECT COUNT(u.idUsuario) as total " . $baseSql . $whereSql;
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

// Data
$dataSql = "SELECT u.idUsuario, u.nombre, u.usuario, p.perfil as perfilNombre, u.idPerfil "
         . $baseSql . $whereSql
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

    if (!empty($finalParams)) $stmtData->bind_param($finalTypes, ...$finalParams);

    if ($stmtData->execute()) {
        $resultData = $stmtData->get_result();
        if ($resultData) { $data = $resultData->fetch_all(MYSQLI_ASSOC); $resultData->free(); }
    }
    $stmtData->close();
}

$mysqli->close();

$response = ["draw" => $draw, "recordsTotal" => $totalRecords, "recordsFiltered" => $totalFiltered, "data" => $data];
echo json_encode($response);
?>