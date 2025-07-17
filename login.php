<?php
// Es buena práctica tener estas líneas al principio para depuración durante el desarrollo.
// Puedes comentarlas o quitarlas en un entorno de producción.
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

// Incluir y ASIGNAR el objeto de conexión retornado por conexion.php
$mysqli = include_once "conexion.php";

// Verificar si la inclusión y la conexión fueron exitosas
if (!$mysqli || !($mysqli instanceof mysqli)) {
    $_SESSION['error'] = "Error crítico al inicializar la conexión con la base de datos. Por favor, contacte al administrador.";
    error_log("login.php: Fallo al incluir conexion.php o el archivo no retornó un objeto mysqli válido.");
    header("Location: index.php");
    exit();
}
if ($mysqli->connect_error) {
    $_SESSION['error'] = "Error de conexión a la base de datos. Verifique las credenciales o el estado del servidor de base de datos.";
    error_log("login.php: Error de conexión a la base de datos (" . $mysqli->connect_errno . ") " . $mysqli->connect_error);
    header("Location: index.php");
    exit();
}
include_once "helpers.php"; // *** Incluir el archivo de helpers ***
if (isset($_POST['usuario']) && isset($_POST['password'])) {

    function validate($data) {
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data);
        return $data;
    }

    $uname = validate($_POST['usuario']);
    $pass = validate($_POST['password']);

    if (empty($uname)) {
        $_SESSION['error'] = "El nombre de Usuario es requerido";
        header("Location: index.php");
        exit();
    } else if (empty($pass)) {
        $_SESSION['error'] = "El Password es requerido";
        header("Location: index.php");
        exit();
    } else {
        $stmt = $mysqli->prepare("SELECT * FROM usuarios WHERE usuario=?");
        $stmt->bind_param("s", $uname);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $row = $result->fetch_assoc();
            if (password_verify($pass, $row['password'])) {
                $_SESSION['usuario'] = $row['usuario'];
                $_SESSION['nombre'] = $row['nombre'];
                $_SESSION['idPerfil'] = $row['idPerfil'];
                $_SESSION['idUsuario'] = $row['idUsuario'];
                
                // *** Cargar los permisos del usuario en la sesión ***
                $_SESSION['permisosUsuario'] = cargarPermisosUsuario($mysqli, $row['idPerfil']);
                
                // Establecer tiempo de inicio de sesión y tiempo de expiración
                $_SESSION['LAST_ACTIVITY'] = time(); // Actualiza el tiempo de la última actividad
                $_SESSION['EXPIRE_TIME'] = 36000; // Tiempo de expiración en segundos (30 minutos)
                header("Location: default.php");
                exit();
            } else {
                $_SESSION['error'] = "Usuario o Password incorrecto";
                header("Location: index.php");
                exit();
            }
        } else {
            $_SESSION['error'] = "Usuario o Password incorrecto";
            header("Location: index.php");
            exit();
        }
    }
} else {
    header("Location: index.php");
    exit();
}
?>