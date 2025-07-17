<?php
// Mostrar todos los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start(); // Iniciar la sesión

// Verificar si la sesión ha expirado
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $_SESSION['EXPIRE_TIME'])) {
    // La sesión ha expirado
    session_unset();     // Eliminar todas las variables de sesión
    session_destroy();   // Destruir la sesión

    session_start();     // Iniciar una nueva sesión para establecer el mensaje de error
    $_SESSION['error'] = "La sesión ha expirado. Por favor, inicie sesión de nuevo.";
    header("Location: index.php");
    exit();
}

// Actualizar el tiempo de la última actividad
$_SESSION['LAST_ACTIVITY'] = time();

$mysqli = include_once "conexion.php";

if (!$mysqli) {
    die("Error al conectar a la base de datos: " . mysqli_connect_error());
}

$usuario_id = $_SESSION['idUsuario']; // Obtener el ID del usuario desde la sesión

$idOca = $_POST['idOca'];
$idProyecto = $_POST["idProyecto"]; // Asegúrate de que este valor esté siendo enviado desde el formulario
$nActa = $_POST["nActa"];
$montoParcial = $_POST["montoParcial"];

echo $sql = "SELECT idOca, idProyecto, nActa FROM control_pagos where idOca = $idOca and nActa = $nActa";
$result = $mysqli->query($sql);

if ($result->num_rows > 0) {
    echo "<script>alert('Este pago ya existe en la base de datos'); window.history.back();</script>";
} else {

// Preparar la sentencia SQL con marcadores de posición para la actualización
$sentenciaInsert = $mysqli->prepare("INSERT control_pagos(idOca, idProyecto, nActa, montoParcial) VALUES (?,?,?,?)");
if ($sentenciaInsert === false) {
    die('Error en la preparación de la consulta Insert: ' . $mysqli->error);
}

// Vincular los parámetros con los valores
$sentenciaInsert->bind_param("iiis", $idOca, $idProyecto, $nActa, $montoParcial);

if ($sentenciaInsert->execute() === false) {
    die('Error en la ejecución de la consulta insert: ' . $sentenciaInsert->error);
}

// Array para mapear los campos y sus valores nuevos
$campos = [
    "idOca" => $idOca,
    "idProyecto" => $idProyecto,
    "nActa" => $nActa,
    "montoParcial" => $montoParcial,
];

// Registrar el cambio en el historial
$tipo_accion = "Insertar";
$tabla_afectada = "control_pagos";

$sentenciaHistorial = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
if ($sentenciaHistorial === false) {
    die('Error en la preparación de la consulta insert historial: ' . $mysqli->error);
}

foreach ($campos as $campo => $valorNuevo) {
    $valorAnterior = $equipoActual[$campo];
    if ($valorAnterior != $valorNuevo) {
        $sentenciaHistorial->bind_param("ississ", $usuario_id, $tipo_accion, $tabla_afectada, $idControl, $valorAnterior, $valorNuevo);
        if ($sentenciaHistorial->execute() === false) {
            die('Error en la ejecución de la consulta insert historial: ' . $sentenciaHistorial->error);
        }
    }
}

// Redirigir a la página de confirmación
header("Location: MensajePagoIngresado.php");
exit();
}
?>
