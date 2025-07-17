<?php
$mysqli = include_once "conexion.php";
header('Content-Type: application/json'); // Asegúrate de enviar JSON

if (isset($_GET['q']) && isset($_GET['type'])) {
    $q = $_GET['q'];
    $type = $_GET['type'];
    
    $search = '%' . $q . '%';
    $response = [];

    // Consulta para proyectos (si la usas en otro lado, mantenla)
    if ($type === 'proyectos') {
        // ... tu código existente para proyectos ...
        // Asegúrate que devuelva 'id' y 'nombre'
         $sql = "SELECT idProyecto, codigoProyecto, municipio FROM proyectos WHERE (codigoProyecto LIKE ? OR municipio LIKE ?) LIMIT 10"; // Asumiendo que buscas por código o municipio
         $stmt = $mysqli->prepare($sql);
         $stmt->bind_param('ss', $search, $search);
         $stmt->execute();
         $result = $stmt->get_result();

         while ($row = $result->fetch_assoc()) {
             $response[] = [
                 'id' => $row['idProyecto'], // Clave 'id'
                 'nombre' => $row['codigoProyecto'] . ' - ' . $row['municipio'], // Clave 'nombre'
                 // 'telefono' => null // Opcional: añadir clave telefono como null si no aplica
             ];
         }
    }

    // Consulta para proveedores (si la usas en otro lado, mantenla)
    if ($type === 'proveedores') {
        // ... tu código existente para proveedores ...
        // Asegúrate que devuelva 'id' y 'nombre'
        $sql = "SELECT idProveedor, proveedor FROM proveedores WHERE proveedor LIKE ? LIMIT 10"; // Ejemplo
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('s', $search);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $response[] = [
                'id' => $row['idProveedor'], // Clave 'id'
                'nombre' => $row['proveedor'], // Clave 'nombre'
                 // 'telefono' => null // Opcional: añadir clave telefono como null si no aplica
            ];
        }
    }

    // --- MODIFICACIÓN IMPORTANTE AQUÍ ---
    // Consulta para residentes
    if ($type === 'residentes') {
        // *** Añadir 'telefono' a la consulta SELECT ***
        $sql = "SELECT idResidente, residente, telefono FROM residentes WHERE residente LIKE ? LIMIT 10";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('s', $search);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $response[] = [
                'id' => $row['idResidente'],   // Clave 'id' que espera el JS
                'nombre' => $row['residente'], // Clave 'nombre' que espera el JS
                'telefono' => $row['telefono'] // *** Añadir clave 'telefono' ***
            ];
        }
    }

    // Consulta para bodegueros
    if ($type === 'bodegueros') {
         // *** Añadir 'telefono' a la consulta SELECT ***
        $sql = "SELECT idBodeguero, bodeguero, telefono FROM bodegueros WHERE bodeguero LIKE ? LIMIT 10";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('s', $search);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $response[] = [
                'id' => $row['idBodeguero'],   // Clave 'id' que espera el JS
                'nombre' => $row['bodeguero'], // Clave 'nombre' que espera el JS
                'telefono' => $row['telefono'] // *** Añadir clave 'telefono' ***
            ];
        }
    }
    // --- FIN MODIFICACIÓN IMPORTANTE ---


    echo json_encode($response);
    
    // Cerrar statement y conexión si es necesario (depende de tu script conexion.php)
    if (isset($stmt)) {
        $stmt->close();
    }
    $mysqli->close();

} else {
     echo json_encode([]); // Devolver array vacío si no hay query o type
}
?>
