<?php

$host = "localhost";
$usuario = "facturacion";
$password = "Domsv2025/*++";
$db = "facturacion";

// Crear conexión
$mysqli_conn = new mysqli($host, $usuario, $password, $db);

// Verificar conexión
if ($mysqli_conn->connect_error) {
    // No hacer die() aquí. Dejar que el script que lo incluye maneje el error.
    // Retornar el objeto permite al script que llama verificar $mysqli_conn->connect_error
    return $mysqli_conn;
}
$mysqli_conn->set_charset("utf8mb4");
return $mysqli_conn;
