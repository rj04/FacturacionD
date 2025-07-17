<?php
// c:\UniServerZ\www\inventario-test\registrarProveedor.do.php
header('Content-Type: application/json');
$mysqli = include_once "conexion.php";
$response = ['success' => false, 'message' => 'Error desconocido.'];

$action = $_GET['action'] ?? null; // Obtener la acción (add, edit)

if ($mysqli->connect_error) {
    $response['message'] = 'Error de conexión a la base de datos.';
    echo json_encode($response);
    exit;
}

try {
    switch ($action) {
        case 'add':
            if (empty($_POST["nombreProveedor"])) {
                throw new Exception('El nombre del proveedor es obligatorio.');
            }
            $nombreProveedor = trim($_POST["nombreProveedor"]);

            $stmtCheck = $mysqli->prepare("SELECT idProveedor FROM proveedores WHERE proveedor = ?");
            if (!$stmtCheck) throw new Exception('Error preparando verificación: ' . $mysqli->error);
            $stmtCheck->bind_param("s", $nombreProveedor);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) {
                throw new Exception('El nombre del proveedor ya existe.');
            }
            $stmtCheck->close();

            $stmt = $mysqli->prepare("INSERT INTO proveedores (proveedor) VALUES (?)");
            if (!$stmt) throw new Exception('Error preparando inserción: ' . $mysqli->error);
            $stmt->bind_param("s", $nombreProveedor);
            if ($stmt->execute()) {
                $response['success'] = true;
                $response['message'] = 'Proveedor agregado correctamente.';
            } else {
                throw new Exception('Error al guardar el proveedor: ' . $stmt->error);
            }
            $stmt->close();
            break;

        case 'edit':
            $idProveedor = filter_input(INPUT_POST, 'idProveedor', FILTER_VALIDATE_INT);
            $nombreProveedor = trim($_POST['nombreProveedor'] ?? '');

            if (!$idProveedor) {
                throw new Exception('ID de proveedor no válido.');
            }
            if (empty($nombreProveedor)) {
                throw new Exception('El nombre del proveedor es obligatorio.');
            }

            // Verificar si el nuevo nombre ya existe (excluyendo el proveedor actual)
            $stmtCheck = $mysqli->prepare("SELECT idProveedor FROM proveedores WHERE proveedor = ? AND idProveedor != ?");
            if (!$stmtCheck) throw new Exception('Error preparando verificación (edit): ' . $mysqli->error);
            $stmtCheck->bind_param("si", $nombreProveedor, $idProveedor);
            $stmtCheck->execute();
            $stmtCheck->store_result();
            if ($stmtCheck->num_rows > 0) {
                throw new Exception('El nombre del proveedor ya está en uso por otro proveedor.');
            }
            $stmtCheck->close();

            $stmt = $mysqli->prepare("UPDATE proveedores SET proveedor = ? WHERE idProveedor = ?");
            if (!$stmt) throw new Exception('Error preparando actualización: ' . $mysqli->error);
            $stmt->bind_param("si", $nombreProveedor, $idProveedor);
            if ($stmt->execute()) {
                $response['success'] = true;
                $response['message'] = 'Proveedor actualizado correctamente.';
            } else {
                throw new Exception('Error al actualizar el proveedor: ' . $stmt->error);
            }
            $stmt->close();
            break;

        default:
            $response['message'] = 'Acción no reconocida.';
            break;
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

$mysqli->close();
echo json_encode($response);
?>
