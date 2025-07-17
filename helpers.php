<?php

// Asegúrate de que la sesión esté iniciada si no lo está ya
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

/**
 * Verifica si el usuario logueado tiene un permiso específico.
 *
 * @param string $nombrePermisoRequerido El nombre del permiso a verificar (ej: 'manage_users').
 * @return bool True si el usuario tiene el permiso, False en caso contrario.
 */
function usuarioTienePermiso($nombrePermisoRequerido) {
    // Verificar si el usuario está logueado y tiene permisos en la sesión
    if (!isset($_SESSION['idUsuario']) || !isset($_SESSION['permisosUsuario']) || !is_array($_SESSION['permisosUsuario'])) {
        return false; // No logueado o sin permisos cargados
    }
    // Buscar el permiso requerido en la lista de permisos del usuario
    return in_array($nombrePermisoRequerido, $_SESSION['permisosUsuario']);
}

/**
 * Carga los nombres de los permisos asociados a un perfil desde la base de datos.
 *
 * @param mysqli $mysqli La conexión a la base de datos.
 * @param int $idPerfil El ID del perfil del usuario.
 * @return array Un array con los nombres de los permisos.
 */
function cargarPermisosUsuario($mysqli, $idPerfil) {
    $permisos = [];
    $stmt = $mysqli->prepare("SELECT p.nombrePermiso FROM permisos p JOIN perfil_permisos pp ON p.idPermiso = pp.idPermiso WHERE pp.idPerfil = ?");
    if ($stmt) {
        $stmt->bind_param("i", $idPerfil);
        if ($stmt->execute()) {
            $result = $stmt->get_result();
            while ($row = $result->fetch_assoc()) {
                $permisos[] = $row['nombrePermiso'];
            }
            $result->free();
        } else {
            error_log("Error al ejecutar carga de permisos: " . $stmt->error); // Loguear error
        }
        $stmt->close();
    } else {
         error_log("Error al preparar carga de permisos: " . $mysqli->error); // Loguear error
    }
    return $permisos;
}
?>