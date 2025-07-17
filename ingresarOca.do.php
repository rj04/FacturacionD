<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start(); // Iniciar la sesión

$mysqli = include_once "conexion.php";

if (!$mysqli) {
    die("Error al conectar a la base de datos: " . mysqli_connect_error());
}

$usuario_id = $_SESSION['idUsuario'];

$oca = $_POST['oca'];
$fechaOca = $_POST['fechaOca'];
$formaPago = $_POST['formaPago'];
$montoTotal = $_POST['montoTotal'];
$idProy = $_POST['idProyecto'];
$idProyecto = preg_replace('/\b[A-Z]\d{4}-\d{4}\s*/', '', $idProy);
$residente = $_POST['idResidente'];
$idProc = $_POST['idProveedor'];
$idProcedencia = preg_replace('/\b[A-Z]\d{4}-\d{4}\s*/', '', $idProc);
$estado = $_POST['estado'];
$fechaEntrega = $_POST['fechaEntrega'];
$comentario = $_POST['comentario'];

// Habilitar la visualización de errores
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Preparar la consulta para insertar en control_ocas
    $sentencia = $mysqli->prepare("INSERT INTO control_ocas(idProyecto, oca, montoTotal, fechaOca, residente, proveedor, fechaEntrega, estado, comentario) VALUES (?, ?, ?, ?, ?, ?, ?)");

    if (!$sentencia) {
        throw new Exception("Error al preparar la consulta: " . $mysqli->error);
    }

    // Enlazar los parámetros
    if (!$sentencia->bind_param("isssssss", $idProyecto, $oca, $montoTotal, s$fechaOca, $residente, $idProcedencia, $fechaEntrega, $estado, $comentario)) {
        throw new Exception("Error al enlazar los parámetros: " . $sentencia->error);
    }

    // Ejecutar la sentencia
    if (!$sentencia->execute()) {
        throw new Exception("Error al ejecutar la consulta: " . $sentencia->error);
    }

    echo "Consulta ejecutada correctamente en control_ocas.";
} catch (mysqli_sql_exception $e) {
    die("Error de MySQL: " . $e->getMessage() . " Error SQL: " . $sentencia->error);
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}

// Obtener el ID del registro insertado
$id_registro = $mysqli->insert_id;

// Registrar el cambio en el historial
$tipo_accion = "insertar";
$tabla_afectada = "control_ocas";
$datos_nuevos = json_encode([
    'idProyecto' => $idProyecto,
    'oca' => $oca,
    'montoTotal' => $montoTotal,
    'fechaOca' => $fechaOca
    'residente' => $residente,
    'idProveedor' => $idProcedencia,
    'estado' => $estado,
    'fechaEntrega' => $fechaEntrega,
    'comentario' => $comentario
]);

$sentencia_historial = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_nuevos) VALUES (?, ?, ?, ?, ?)");

if (!$sentencia_historial) {
    die("Error al preparar la consulta del historial: " . $mysqli->error);
}

if (!$sentencia_historial->bind_param("issis", $usuario_id, $tipo_accion, $tabla_afectada, $id_registro, $datos_nuevos)) {
    die("Error al enlazar los parámetros del historial: " . $sentencia_historial->error);
}

if (!$sentencia_historial->execute()) {
    die("Error al ejecutar la consulta del historial: " . $sentencia_historial->error);
}

// Redirigir a la página de confirmación
header("Location: confirmarIngresoOca.php");
exit();

?>
