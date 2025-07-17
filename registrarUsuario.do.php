<?php
$mysqli = include_once "conexion.php";
$nombre = $_POST["nombre"];
$usuario  = $_POST['usuario'];
$password  = $_POST['password'];
$idPerfil  = $_POST['idPerfil'];

// Validar la longitud mínima de la contraseña
if (strlen($password) < 8) {
    header("Location: registrarUsuario.php?error=La contraseña debe tener al menos 8 caracteres.");
    exit();
}

// Verificar si el usuario ya existe
$verificarSentencia = $mysqli->prepare("SELECT * FROM usuarios WHERE nombre = ? OR usuario = ?");
$verificarSentencia->bind_param("ss", $nombre, $usuario);
$verificarSentencia->execute();
$resultado = $verificarSentencia->get_result();

if ($resultado->num_rows > 0) {
    // Si ya existe, redirigir a registrarUsuario.php con un mensaje de error
    header("Location: registrarUsuario.php?error=El Usuario o el Nombre ya existen.");
    exit();
} else {
    // Si no existe, insertar el nuevo usuario con contraseña segura
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $sentencia = $mysqli->prepare("INSERT INTO usuarios (nombre, usuario, password, idPerfil) VALUES (?, ?, ?, ?)");
    $sentencia->bind_param("sssi", $nombre, $usuario, $hashed_password, $idPerfil);
    $sentencia->execute();
    header("Location: confirmarIngresoUsuario.php");
    exit();
}
?>
