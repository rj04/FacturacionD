<?php
function archivoExcluido($codigoProyecto, $mysqli) {
    $query = "SELECT COUNT(*) FROM archivos_excluidos WHERE codigoProyecto = ?";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param('s', $codigoProyecto);
    $stmt->execute();
    $stmt->bind_result($count);
    $stmt->fetch();
    $stmt->close();

    return $count > 0; // Devuelve true si el archivo está excluido
}

function logMessage($message) {
    $logFile = 'uploadExcel_log.txt';
    $logEntry = date('Y-m-d H:i:s') . " - " . $message . "\n";
    if (file_put_contents($logFile, $logEntry, FILE_APPEND) === false) {
        error_log("No se pudo escribir en el log: $logFile");
    }
}


function formatDate($cell, $fechaIngresoProyecto) {
    // Lógica para formatear la fecha
    $fechaIngreso = null;
    if ($cell->getDataType() === \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING) {
        $date = DateTime::createFromFormat('d/m/Y', $fechaIngresoProyecto);
        $fechaIngreso = $date ? $date->format('Y-m-d') : null;
    } else {
        $dateValue = $cell->getValue();
        if ($dateValue !== null && $dateValue != "") {
            try {
                $dateObject = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateValue);
                $fechaIngreso = $dateObject->format('Y-m-d');
            } catch (Exception $e) {
                logMessage("Error al convertir la fecha: " . $e->getMessage());
                $fechaIngreso = null;
            }
        }
    }
    return $fechaIngreso;
}

function extraerCodigoProyecto($nombreArchivo) {
    // Suponiendo que el código del proyecto es la primera parte del nombre del archivo
    // Ejemplo: "S0821-2021 -SANTA CLARA , SAN VICENTE"
    $partes = explode(' -', $nombreArchivo); // Divide en la primera aparición de " -"
    return isset($partes[0]) ? trim($partes[0]) : null; // Devuelve la primera parte como código del proyecto
}

// Función para validar y formatear fechas
function procesarFecha($fecha) {
    try {
        // Si es null, vacío o no es una fecha válida, retornar NULL
        if ($fecha === null || $fecha === '' || $fecha === 'N/A') {
            return null; // Cambiar a null para insertar en la base de datos
        }
        
        // Debug del valor recibido
        error_log("Procesando fecha original: " . var_export($fecha, true));
        
        // Si ya está en formato Y-m-d, devolverla tal cual
        if (is_string($fecha) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            return $fecha;
        }
        
        // Si es una cadena en formato de fecha
        if (is_string($fecha)) {
            $fecha = trim($fecha);
            
            // Intentar primero con formato dd/mm/yyyy
            $partes = explode('/', $fecha);
            if (count($partes) === 3) {
                // Primero intentamos con formato dd/mm/yyyy
                $dia = $partes[0];
                $mes = $partes[1];
                $anio = $partes[2];
                
                if (checkdate($mes, $dia, $anio)) {
                    $resultado = sprintf('%04d-%02d-%02d', $anio, $mes, $dia);
                    error_log("Fecha convertida (dd/mm/yyyy): $fecha -> $resultado");
                    return $resultado;
                }
                
                // Si falla, intentamos con formato mm/dd/yyyy
                $mes = $partes[0];
                $dia = $partes[1];
                $anio = $partes[2];
                
                if (checkdate($mes, $dia, $anio)) {
                    $resultado = sprintf('%04d-%02d-%02d', $anio, $mes, $dia);
                    error_log("Fecha convertida (mm/dd/yyyy): $fecha -> $resultado");
                    return $resultado;
                }
            }
        }
        
        // Si es un número de Excel
        if (is_numeric($fecha)) {
            try {
                $fechaObj = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($fecha);
                $resultado = $fechaObj->format('Y-m-d');
                error_log("Fecha Excel convertida: $fecha -> $resultado");
                return $resultado;
            } catch (Exception $e) {
                error_log("Error convirtiendo fecha Excel: " . $e->getMessage());
                return null; // Cambiar a null para insertar en la base de datos
            }
        }

        // Si llegamos aquí, intentamos con DateTime
        try {
            $fechaObj = new DateTime($fecha);
            $resultado = $fechaObj->format('Y-m-d');
            error_log("Fecha convertida con DateTime: $fecha -> $resultado");
            return $resultado;
        } catch (Exception $e) {
            // Si falla DateTime, retornamos NULL
            error_log("Error procesando fecha con DateTime: " . $e->getMessage());
            return null; // Cambiar a null para insertar en la base de datos
        }
        
    } catch (Exception $e) {
        logMessage("Error procesando fecha: " . $e->getMessage());
        return null; // En lugar de lanzar una excepción, retornamos null
    }
}

// Función para validar y formatear cantidades
function procesarCantidad($cantidad) {
    // Si es null o vacío, lanzar excepción
    if ($cantidad === null || $cantidad === '') {
        throw new Exception("La cantidad no puede estar vacía");
    }

    // Convertir a string si no lo es
    $cantidad = (string)$cantidad;
    
    // Limpiar la cantidad
    $cantidad = trim($cantidad);
    $cantidad = str_replace(',', '.', $cantidad);
    $cantidad = str_replace(' ', '', $cantidad);
    
    // Validar que sea un número
    if (!is_numeric($cantidad)) {
        throw new Exception("La cantidad debe ser un número válido");
    }
    
    $cantidad = floatval($cantidad);
    
    // Validar que sea positivo
    if ($cantidad <= 0) {
        throw new Exception("La cantidad debe ser mayor que cero");
    }
    
    return $cantidad;
}

// Función para validar si existe el proyecto
function validarProyecto($codigoProyecto) {
    global $mysqli;
    
    if (empty($codigoProyecto)) {
        throw new Exception("El código del proyecto está vacío");
    }
    
    logMessage("Validando proyecto con código: " . $codigo);
    
    $query = "SELECT idProyecto FROM proyectos WHERE codigoProyecto = ? AND status = 'ACTIVO'";
    $stmt = $mysqli->prepare($query);
    
    if (!$stmt) {
        throw new Exception("Error preparando la consulta: " . $mysqli->error);
    }
    
    $stmt->bind_param('s', $codigoProyecto);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $stmt->close();
    
    if ($resultado->num_rows === 0) {
        throw new Exception("No se encontró el proyecto con código: $codigoProyecto");
    }
    
    $row = $resultado->fetch_assoc();
    logMessage("Proyecto encontrado con ID: " . $row['idProyecto']);
    
    return $row['idProyecto'];
}

// Función para procesar el lote de registros
function procesarLote($mysqli, $batchRecords) {
    if (empty($batchRecords)) return;
    
    // Para alquileres, no verificamos duplicados ya que cada registro es un alquiler individual
    $batchQuery = implode(',', $batchRecords);
    
    $insertQuery = "INSERT INTO ingresos_materiales (
        idProyecto,
        material,
        unidadMedida,
        cantidad,
        fechaIngreso,
        procedencia,
        oca,
        comentario
    ) VALUES " . $batchQuery;
    
    logMessage("Query completa: " . $insertQuery);
    
    if ($mysqli->query($insertQuery) === FALSE) {
        throw new Exception("Error en la inserción: " . $mysqli->error . "\nQuery: " . $insertQuery);
    }
}


function limpiarComentario($comentario) {
    // Eliminar el texto estándar de threaded comment
    $comentario = str_replace('[Threaded comment]', '', $comentario);
    $comentario = str_replace('Your version of Excel allows you to read this threaded comment; however, any edits to it will get removed if the file is opened in a newer version of Excel. Learn more: https://go.microsoft.com/fwlink/?linkid=870924', '', $comentario);
    
    // Eliminar "Comment:" y espacios extra
    $comentario = str_replace('Comment:', '', $comentario);
    
    // Limpiar espacios y saltos de línea
    $comentario = trim($comentario);
    
    return $comentario;
}

function extraerComentarios($archivo_excel) {
    $comentarios = [];
    
    try {
        $spreadsheet = IOFactory::load($archivo_excel);
        $worksheet = $spreadsheet->getActiveSheet();
        
        logMessage("Iniciando extracción de comentarios con PhpSpreadsheet 1.29.0");
        
        // Obtener todos los comentarios del worksheet
        $allComments = $worksheet->getComments();
        logMessage("Comentarios encontrados en el worksheet: " . count($allComments));
        
        // Iterar sobre las filas relevantes
        for ($row = 6; $row <= $worksheet->getHighestRow(); $row++) {
            $cellAddress = 'H' . $row;
            
            // Verificar si hay un comentario en esta celda
            if (isset($allComments[$cellAddress])) {
                $comment = $allComments[$cellAddress];
                $commentText = $comment->getText()->getPlainText();
                
                // Limpiar el comentario
                $commentText = limpiarComentario($commentText);
                
                if (!empty($commentText)) {
                    $comentarios[$cellAddress] = $commentText;
                    logMessage("Comentario limpio en $cellAddress: $commentText");
                }
            }
        }
        
        logMessage("Total de comentarios extraídos: " . count($comentarios));
        
    } catch (Exception $e) {
        logMessage("Error al extraer comentarios: " . $e->getMessage());
        logMessage("Traza: " . $e->getTraceAsString());
    }
    
    return $comentarios;
}

function obtenerNombreArchivoExcel($spreadsheet) {
    try {
        // Obtener las propiedades del documento
        $properties = $spreadsheet->getProperties();
        
        // Obtener el título y validar que no sea null
        $title = $properties->getTitle();
        $title = $title !== null ? trim($title) : '';
        
        // Debug del título original
        logMessage("Título original del Excel: " . ($title ?: 'No encontrado'));
        
        // Si no hay título, intentar obtener de la primera fila
        if (empty($title)) {
            $worksheet = $spreadsheet->getActiveSheet();
            
            // Intentar diferentes celdas donde podría estar el título
            $posiblesCeldas = ['A1', 'B1', 'C1', 'D1'];
            foreach ($posiblesCeldas as $celda) {
                $valor = $worksheet->getCell($celda)->getValue();
                $valor = $valor !== null ? trim($valor) : '';
                logMessage("Valor en celda $celda: " . $valor);
                
                if (!empty($valor) && preg_match('/S\d{4}-\d{4}/', $valor)) {
                    $title = $valor;
                    break;
                }
            }
        }
        
        // Si aún no tenemos título, intentar obtener del nombre de la hoja
        if (empty($title)) {
            $sheetTitle = $spreadsheet->getActiveSheet()->getTitle();
            $title = $sheetTitle !== null ? trim($sheetTitle) : '';
            logMessage("Título de la hoja activa: " . $title);
        }
        
        // Si aún no tenemos título, intentar obtener del nombre del archivo
        if (empty($title)) {
            // Obtener el nombre del archivo físico
            $filename = $spreadsheet->getProperties()->getCustomProperty('Filename');
            if ($filename !== null) {
                $title = trim($filename);
                logMessage("Nombre del archivo físico: " . $title);
            }
        }
        
        // Debug del título encontrado
        logMessage("Título final encontrado: " . ($title ?: 'No encontrado'));
        
        if (empty($title)) {
            throw new Exception("No se pudo encontrar el título del documento Excel");
        }
        
        // Extraer el código del proyecto
        if (preg_match('/S\d{4}-\d{4}/', $title, $matches)) {
            $codigoProyecto = $matches[0];
            logMessage("Código de proyecto extraído: $codigoProyecto");
            return $codigoProyecto;
        }
        
        // Si llegamos aquí, devolver el título completo
        return $title;
        
    } catch (Exception $e) {
        logMessage("Error procesando título del archivo: " . $e->getMessage());
        logMessage("Traza del error: " . $e->getTraceAsString());
        throw $e;
    }
}

function verificarArchivoExcluido($mysqli, $nombreArchivo) {
    try {
        logMessage("Verificando archivo excluido: $nombreArchivo");
        
        // Primero intentar con el nombre exacto
        $query = "SELECT COUNT(*) as total FROM archivos_excluidos 
                 WHERE nombreArchivo = ?";
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("s", $nombreArchivo);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['total'] > 0) {
            logMessage("Archivo encontrado en lista de excluidos (coincidencia exacta)");
            return true;
        }
        
        // Si no hay coincidencia exacta, extraer el código del proyecto
        try {
            $codigoProyecto = extraerCodigoProyecto($nombreArchivo);
            logMessage("Buscando por código de proyecto: " . $codigoProyecto);
            
            $query = "SELECT COUNT(*) as total FROM archivos_excluidos 
                     WHERE nombreArchivo LIKE ? OR codigoProyecto = ?";
            $nombreBusqueda = $codigoProyecto . '%';
            $stmt = $mysqli->prepare($query);
            $stmt->bind_param("ss", $nombreBusqueda, $codigoProyecto);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            $excluido = ($row['total'] > 0);
            logMessage("Archivo " . ($excluido ? "está" : "no está") . " excluido por código de proyecto");
            
            return $excluido;
            
        } catch (Exception $e) {
            logMessage("Error extrayendo código de proyecto: " . $e->getMessage());
        }
        
        // Si todo lo anterior falla, intentar una búsqueda más flexible
        $query = "SELECT COUNT(*) as total FROM archivos_excluidos 
                 WHERE ? LIKE CONCAT(nombreArchivo, '%')";
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("s", $nombreArchivo);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        $excluido = ($row['total'] > 0);
        logMessage("Archivo " . ($excluido ? "está" : "no está") . " excluido (búsqueda flexible)");
        
        return $excluido;
        
    } catch (Exception $e) {
        logMessage("Error verificando archivo excluido: " . $e->getMessage());
        throw $e;
    }
}

function verificarArchivoProcesado($mysqli, $nombreArchivo) {
    try {
        logMessage("Verificando archivo procesado: $nombreArchivo");
        
        $query = "SELECT COUNT(*) as total FROM archivos_procesadosma WHERE nombreArchivo LIKE ?";
        $nombreBusqueda = $nombreArchivo . '%';
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("s", $nombreBusqueda);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        $procesado = ($row['total'] > 0);
        logMessage("Archivo " . ($procesado ? "ya fue" : "no ha sido") . " procesado");
        
        return $procesado;
        
    } catch (Exception $e) {
        logMessage("Error verificando archivo procesado: " . $e->getMessage());
        throw $e;
    }
}

function registrarArchivoProcesado($mysqli, $nombreArchivo) {
    $query = "INSERT INTO archivos_procesadosma (nombreArchivo, fechaProcesado) VALUES (?, NOW())";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("s", $nombreArchivo);
    
    if ($stmt->execute()) {
        logMessage("Archivo registrado como procesado: $nombreArchivo");
        return true;
    } else {
        logMessage("Error al registrar archivo procesado: " . $stmt->error);
        return false;
    }
}

?>
