<?php

function consultarHerramientasPorProyectos(array $idsProyectos) {
    global $mysqli;

    // Preparar la consulta con marcadores de posición para los IDs de los proyectos
    $placeholders = implode(',', array_fill(0, count($idsProyectos), '?'));
    $sql = "SELECT herramienta, bueno, danado FROM ingresos_herramientas_copia WHERE idProyecto IN ($placeholders)";
    $stmt = $mysqli->prepare($sql);

    // Vincular los parámetros a la consulta
    $params = array_merge([$placeholders], $idsProyectos);
    call_user_func_array(array($stmt, 'bind_param'), $params);

    $stmt->execute();
    $result = $stmt->get_result();

    $herramientas = [];
    while ($row = $result->fetch_assoc()) {
        $herramientas[] = $row;
    }
    return $herramientas;
}

function normalize($string) {
    return strtolower(trim($string));
}

function normalizar($cadena) {
    $cadena = strtolower(trim($cadena, 'UTF-8'));
    $cadena = preg_replace('/\s+/', ' ', $cadena);
    // Eliminar dimensiones y cualquier otra información no relevante
    $cadena = preg_replace('/\s*(\d+)\s*[xX]?\s*(\d+)?\s*[cC][mM]?/', '', $cadena);
    $cadena = str_replace(['á', 'é', 'í', 'ó', 'ú'], ['a', 'e', 'i', 'o', 'u'], $cadena);
    return trim($cadena);
}

// Función para normalizar el nombre de la herramienta
function normalizarHerramienta($nombreHerramienta, $cambios_herramientas) {
    // Verifica si el nombre de la herramienta está en el array de cambios
    if (array_key_exists($nombreHerramienta, $cambios_herramientas)) {
        return $cambios_herramientas[$nombreHerramienta];
    }
    return $nombreHerramienta; // Si no hay cambio, devuelve el nombre original
}


// Función para verificar si una herramienta está en la lista de excluidas
function esHerramientaExcluida($herramienta, $herramientasExcluidas) {
    // Convertir tanto la herramienta como las exclusiones a minúsculas para una comparación insensible a mayúsculas y minúsculas
    $herramienta = strtolower($herramienta);
    $herramientasExcluidas = array_map('strtolower', $herramientasExcluidas);

    foreach ($herramientasExcluidas as $exclusion) {
        if (strpos($herramienta, $exclusion) !== false) {
            return true;
        }
    }
    return false;
}


function limpiarHerramienta($herramienta) {
    // Reemplazar el carácter non-breaking space (\xA0) con un espacio normal
    $herramienta = str_replace("\xA0", ' ', $herramienta);
    
    // Reemplazar cualquier otro carácter de espacio que no sea visible (tabulaciones, etc.)
    $herramienta = preg_replace('/\s+/', ' ', $herramienta); // Reemplazar múltiples espacios por uno solo
    
    // Trimear espacios al inicio y al final
    $herramienta = trim($herramienta);
    
    return $herramienta;
}

function limpiarEquipo($equipo) {
    // Reemplazar el carácter non-breaking space (\xA0) con un espacio normal
    $equipo = str_replace("\xA0", ' ', $equipo);
    
    // Reemplazar cualquier otro carácter de espacio que no sea visible (tabulaciones, etc.)
    $equipo = preg_replace('/\s+/', ' ', $equipo); // Reemplazar múltiples espacios por uno solo
    
    // Trimear espacios al inicio y al final
    $equipo = trim($equipo);
    
    return $equipo;
}



function eliminarTildes($texto) {
    $tildes = [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
        'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U'
    ];

    return str_replace(array_keys($tildes), array_values($tildes), $texto);
}

// Función para convertir caracteres a su representación hexadecimal
function mostrarCaracteresEspeciales($string) {
    $output = '';
    for ($i = 0; $i < strlen($string); $i++) {
        $char = $string[$i];
        $output .= '[' . $char . ' - ' . bin2hex($char) . ']';
    }
    return $output;
}

function extractCommentsFromExcel($filePath)
{
    // Ruta del archivo ZIP .xlsx
    $zip = new ZipArchive;
    if ($zip->open($filePath) === TRUE) {
        // Buscar archivos de comentarios (xl/comments*.xml)
        $commentsFile = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filename = $zip->getNameIndex($i);
            if (strpos($filename, 'xl/comments') === 0 && strpos($filename, '.xml') !== false) {
                $commentsFile = $filename;
                break;
            }
        }

        if ($commentsFile) {
            // Leer el archivo de comentarios
            $xmlReader = new XMLReader();
            $xmlReader->open('zip://' . $filePath . '#' . $commentsFile);

            $comments = [];
            $currentRef = '';
            $currentText = '';

            while ($xmlReader->read()) {
                if ($xmlReader->nodeType === XMLReader::ELEMENT) {
                    if ($xmlReader->name === 'comment') {
                        // Capturar el atributo 'ref' (celda a la que pertenece el comentario)
                        $currentRef = $xmlReader->getAttribute('ref');
                    } elseif ($xmlReader->name === 't') {
                        // Leer el texto del comentario
                        $xmlReader->read(); // Avanzar al contenido del texto
                        $currentText = $xmlReader->value;
                    }
                }

                // Guardar el comentario completo al cerrar el elemento 'comment'
                if ($xmlReader->nodeType === XMLReader::END_ELEMENT && $xmlReader->name === 'comment') {
                    if ($currentRef && $currentText) {
                        $comments[$currentRef] = $currentText;
                    }
                    $currentRef = '';
                    $currentText = '';
                }
            }

            $xmlReader->close();
            $zip->close();

            return $comments; // Devolver los comentarios como un arreglo asociativo
        } else {
            $zip->close();
            throw new Exception("No se encontró el archivo de comentarios en el archivo Excel.");
        }
    } else {
        throw new Exception("No se pudo abrir el archivo Excel.");
    }
}

// Registrar mensajes en el log y manejar posibles errores de escritura

function estandarizarHerramienta($herramienta, $cambios_herramientas) {
    foreach ($cambios_herramientas as $cambio) {
        if (strcasecmp(trim($herramienta), trim($cambio['original'])) === 0) {
            return $cambio['nuevo'];
        }
    }
    return $herramienta; // Si no hay coincidencia, se devuelve el mismo nombre
}