<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario'])) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(["error" => "Acceso no autorizado."]);
    exit;
}
// Asumimos que si el usuario llegó a gestionarPermisos.php, tiene permiso.
// Podrías re-verificar el permiso aquí si es un endpoint muy sensible.
// include_once "helpers.php";
// if (!usuarioTienePermiso('manage_profiles')) { // O 'manage_all_permissions'
//     header('HTTP/1.1 403 Forbidden');
//     echo json_encode(["error" => "Permiso denegado."]);
//     exit;
// }
// --- Fin Control de Acceso ---

$mysqli = include_once "conexion.php";

// Verificar si la conexión a la BD falló
if (!$mysqli || !($mysqli instanceof mysqli)) {
    header('Content-Type: application/json'); // Asegurar el header
    echo json_encode([
        "draw" => isset($_GET['draw']) ? intval($_GET['draw']) : 0,
        "recordsTotal" => 0,
        "recordsFiltered" => 0,
        "data" => [],
        "error" => "Error de conexión a la base de datos. Revise los logs del servidor." // Mensaje de error para DataTables
    ]);
    exit;
}

$draw = isset($_GET['draw']) ? intval($_GET['draw']) : 0;
$start = isset($_GET['start']) ? intval($_GET['start']) : 0;
$length = isset($_GET['length']) ? intval($_GET['length']) : 10;
$searchValue = isset($_GET['search']['value']) ? $mysqli->real_escape_string($_GET['search']['value']) : '';

$columns = ['idPermiso', 'nombrePermiso', 'descripcionPermiso']; // <--- CAMBIO AQUÍ
$orderByColumnIndex = 1; // Default a nombrePermiso (índice 1 de $columns)
$orderByDir = 'ASC'; // Default direction

if (isset($_GET['order'][0]['column'])) {
    $orderByColumnIndex = intval($_GET['order'][0]['column']);
}
$orderByColumn = $columns[$orderByColumnIndex] ?? 'nombrePermiso'; // <--- CAMBIO AQUÍ
if (isset($_GET['order'][0]['dir']) && strtolower($_GET['order'][0]['dir']) === 'desc') {
    $orderByDir = 'DESC';
}

$queryBase = "FROM permisos";
$searchCondition = "";
if (!empty($searchValue)) {
    $searchCondition = " WHERE (nombrePermiso LIKE '%$searchValue%' OR descripcionPermiso LIKE '%$searchValue%')"; // <--- CAMBIO AQUÍ
}

$resultTotal = $mysqli->query("SELECT COUNT(*) as total $queryBase");
$totalRecords = $resultTotal ? $resultTotal->fetch_assoc()['total'] : 0;

$queryFiltered = "SELECT COUNT(*) as total $queryBase $searchCondition";
$resultFiltered = $mysqli->query($queryFiltered);
$totalFilteredRecords = $resultFiltered ? $resultFiltered->fetch_assoc()['total'] : 0;

$queryData = "SELECT idPermiso, nombrePermiso, descripcionPermiso $queryBase $searchCondition ORDER BY $orderByColumn $orderByDir LIMIT $start, $length"; // <--- CAMBIO AQUÍ
$resultData = $mysqli->query($queryData);

$data = [];
if ($resultData) {
    while ($row = $resultData->fetch_assoc()) {
        $data[] = $row;
    }
}

$mysqli->close();

$response = [
    "draw" => $draw,
    "recordsTotal" => $totalRecords,
    "recordsFiltered" => $totalFilteredRecords,
    "data" => $data
];

header('Content-Type: application/json');
echo json_encode($response);
?>
