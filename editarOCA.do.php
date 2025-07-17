<?php
// En tu script que guarda los cambios de una OCA editada (ej. guardar_edicion_oca.php)
// ... (después de la conexión a BD, validaciones, y obtener el $idOca y $usuario_id)

$mysqli->begin_transaction();

try {
    // 1. OBTENER EL ESTADO 'impresa' ANTES DE LA EDICIÓN
    $estado_impresa_antes_de_editar = null;
    $stmtEstadoPrevio = $mysqli->prepare("SELECT impresa FROM control_ocas WHERE idOca = ?");
    // ... (bind, execute, get_result, fetch_assoc) ...
    // $estado_impresa_antes_de_editar = $fila['impresa'];
    // $stmtEstadoPrevio->close();

    // 2. OBTENER DATOS COMPLETOS ANTERIORES PARA EL HISTORIAL DE EDICIÓN
    // (Es buena práctica guardar todos los campos que se van a modificar)
    // $datos_completos_anteriores_json = json_encode($fila_con_todos_los_datos_viejos);

    // 3. EJECUTAR LA ACTUALIZACIÓN DE LOS CAMPOS DE LA OCA (tu lógica actual de UPDATE)
    // $sql_update = "UPDATE control_ocas SET campo1=?, campo2=?, ..., fechaCompras=? WHERE idOca=?";
    // ... (preparar, bind con los nuevos valores del formulario, ejecutar) ...
    // $datos_completos_nuevos_json = json_encode($_POST); // Simplificado

    // 4. LÓGICA PARA RESETEAR 'impresa' SI ES NECESARIO
    $resetear_estado_impresa = false;
    if ($estado_impresa_antes_de_editar == 1) {
        // Si la OCA estaba marcada como impresa, y se ha editado,
        // la volvemos a marcar como "nueva" (impresa = 0).
        // Podrías añadir condiciones más específicas si solo ciertos cambios deben resetearla.
        $stmtResetImpresa = $mysqli->prepare("UPDATE control_ocas SET impresa = 0 WHERE idOca = ?");
        $stmtResetImpresa->bind_param("i", $idOca);
        if (!$stmtResetImpresa->execute()) {
            throw new Exception("Error al resetear estado 'impresa' tras edición: " . $stmtResetImpresa->error);
        }
        $stmtResetImpresa->close();
        $resetear_estado_impresa = true;
    }

    // 5. REGISTRAR EN HISTORIAL
    //    a. Historial de la EDICIÓN PRINCIPAL (con todos los campos que cambiaron)
    //       $tipo_accion_edicion = "editar_oca";
    //       $tabla_afectada = "control_ocas";
    //       $sentenciaHistorialEdicion = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
    //       // ... (bind con $datos_completos_anteriores_json y $datos_completos_nuevos_json) ...
    //       $sentenciaHistorialEdicion->execute();
    //       $sentenciaHistorialEdicion->close();

    //    b. Si el estado 'impresa' se reseteó específicamente por esta edición
    if ($resetear_estado_impresa) {
        $tipo_accion_reset = "reset_impresion_por_edicion";
        $tabla_afectada = "control_ocas";
        $datos_anteriores_impresa_hist = json_encode(['impresa' => $estado_impresa_antes_de_editar]); // Era 1
        $datos_nuevos_impresa_hist = json_encode(['impresa' => 0]); // Ahora es 0
        
        $sentenciaHistorialReset = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
        // ... (bind con $usuario_id, $tipo_accion_reset, etc.) ...
        $sentenciaHistorialReset->execute();
        $sentenciaHistorialReset->close();
    }

    $mysqli->commit();
    // $response['success'] = true;
    // $response['message'] = "OCA actualizada correctamente.";
    // if ($resetear_estado_impresa) {
    //    $response['message'] .= " El estado de impresión ha sido marcado como 'Nueva' debido a la modificación.";
    // }

} catch (Exception $e) {
    $mysqli->rollback();
    // $response['message'] = "Error al actualizar la OCA: " . $e->getMessage();
    // error_log("Error en script de edición de OCA: " . $e->getMessage());
}

// $mysqli->close();
// echo json_encode($response);
?>
