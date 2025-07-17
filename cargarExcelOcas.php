<?php
// c:\UniServerZ\www\facturacion\cargarExcelOcas.php

error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

require 'vendor/autoload.php'; // Include PhpSpreadsheet autoloader

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

// Include necessary files
$mysqli = include_once "conexion.php";
include_once "helpers.php"; // For usuarioTienePermiso

// --- Control de Acceso ---
if (!isset($_SESSION['idUsuario']) || !usuarioTienePermiso('upload_excel_ocas')) {
    // If it's an AJAX request, send JSON error
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Acceso denegado. No tiene permiso para cargar Excel de OCAs.']);
        exit;
    } else {
        // If it's a regular GET request, show error page or message
        echo "<div class='content-wrapper'><section class='content'><div class='container-fluid'><div class='alert alert-danger'>Acceso denegado. No tiene permiso para cargar Excel de OCAs.</div></div></section></div>";
        include_once "footer.php"; // Assuming footer includes necessary closing tags
        exit;
    }
}

$usuario_id = $_SESSION['idUsuario'];

// Define the ID for the "Observada" state
// !!! IMPORTANT: Verify this ID in your `estado_oca` table !!!
define('ID_ESTADO_OBSERVADA', 3); // Example ID, adjust as needed

// --- AJAX POST Request Handling ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {

    header('Content-Type: application/json');
    $response = ['success' => false, 'message' => 'Error desconocido.', 'processed_rows' => 0, 'inserted_count' => 0, 'skipped_count' => 0, 'errors' => []];

    if ($mysqli->connect_error) {
        $response['message'] = "Error de conexión a la base de datos: " . $mysqli->connect_error;
        echo json_encode($response);
        exit;
    }

    // Get form data (Project and State selection)
    $idEstado_Oca = filter_input(INPUT_POST, 'idEstado_Oca', FILTER_VALIDATE_INT);

     if (!$idEstado_Oca) {
        $response['message'] = "Error: Debe seleccionar un Estado para asignar a las OCAs importadas.";
        $mysqli->close();
        echo json_encode($response);
        exit;
    }


    // Check for uploaded file
    if (!isset($_FILES['excel_file']) || $_FILES['excel_file']['error'] !== UPLOAD_ERR_OK) {
        $response['message'] = 'Error al subir el archivo: ' . $_FILES['excel_file']['error'];
        // Provide more specific error messages based on $_FILES['excel_file']['error']
        switch ($_FILES['excel_file']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $response['message'] = 'El archivo subido excede el tamaño máximo permitido.';
                break;
            case UPLOAD_ERR_PARTIAL:
                $response['message'] = 'El archivo subido fue cargado solo parcialmente.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $response['message'] = 'No se seleccionó ningún archivo para subir.';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $response['message'] = 'Falta una carpeta temporal en el servidor.';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $response['message'] = 'Fallo al escribir el archivo en el disco.';
                break;
            case UPLOAD_ERR_EXTENSION:
                $response['message'] = 'Una extensión de PHP detuvo la carga del archivo.';
                break;
            default:
                $response['message'] = 'Error de carga de archivo desconocido.';
                break;
        }
        $mysqli->close();
        echo json_encode($response);
        exit;
    }

    $inputFileName = $_FILES['excel_file']['tmp_name'];

    try {
        $spreadsheet = IOFactory::load($inputFileName);
        $sheet = $spreadsheet->getSheetByName('consolidado'); // Get sheet by name

        if (!$sheet) {
             // Fallback: Try getting the first sheet if 'consolidado' is not found
             $sheet = $spreadsheet->getActiveSheet();
             error_log("Sheet 'consolidado' not found. Using active sheet: " . $sheet->getTitle());
             // Optionally add a warning to the user response
             $response['errors'][] = "Advertencia: No se encontró la hoja llamada 'consolidado'. Se procesará la hoja activa ('" . $sheet->getTitle() . "'). Asegúrese de que contenga los datos correctos.";
        }


        $highestRow = $sheet->getHighestRow(); // e.g. 10
        $highestColumn = $sheet->getHighestColumn(); // e.g. 'K'
        $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn); // e.g. 11 (for K)

        // Data starts at B2 (row 2, column B)
        $startRow = 2;
        $startColumnIndex = 2; // Column B

        $dataToInsert = [];
        $skippedRows = [];
        $errors = [];
        $processedRowCount = 0;

        // Pre-fetch providers for lookup
        $providers = [];
        $resultProviders = $mysqli->query("SELECT idProveedor, proveedor FROM proveedores");
        if ($resultProviders) {
            while ($row = $resultProviders->fetch_assoc()) {
                $providers[mb_strtolower(trim($row['proveedor']))] = $row['idProveedor'];
            }
            $resultProviders->free();
        } else {
             $errors[] = "Error al cargar la lista de proveedores: " . $mysqli->error;
             // Decide if you want to stop or continue without provider lookup
             // For now, let's stop if providers cannot be loaded
             $response['message'] = "Error crítico: No se pudo cargar la lista de proveedores.";
             $response['errors'] = $errors;
             $mysqli->close();
             echo json_encode($response);
             exit;
        }


        // Pre-fetch existing OCAs for duplicate check (only relevant fields)
        // Fetch only oca_numero, anio_oca, numero_acta, idEstado_Oca
        // MODIFIED: Fetch 'oca' (the full OCA string) and 'numero_acta'

        $existingOcas = [];
        $resultExistingOcas = $mysqli->query("SELECT oca, numero_acta, idEstado_Oca FROM control_ocas"); // Assuming 'oca' is the column for "OCA-NUMERO/AÑO"
        if ($resultExistingOcas) {
            while ($row = $resultExistingOcas->fetch_assoc()) {
                // Use a composite key for easy lookup: "oca_completa|numero_acta"
                $key = mb_strtolower(trim((string)$row['oca'])) . '|' . mb_strtolower(trim((string)$row['numero_acta']));
                $existingOcas[$key] = (int)$row['idEstado_Oca'];
            }
            $resultExistingOcas->free();
        } else {
             $errors[] = "Error al cargar la lista de OCAs existentes para verificación: " . $mysqli->error;
             // Decide if you want to stop or continue without duplicate check
             // For now, let's stop if existing OCAs cannot be loaded
             $response['message'] = "Error crítico: No se pudo cargar la lista de OCAs existentes para verificación.";
             $response['errors'] = $errors;
             $mysqli->close();
             echo json_encode($response);
             exit;
        }


        // Loop through rows
        for ($row = $startRow; $row <= $highestRow; $row++) {
            $processedRowCount++;
            $rowData = $sheet->rangeToArray('B' . $row . ':K' . $row, NULL, TRUE, FALSE)[0]; // Get data from B to K
            error_log("DEBUG Fila $row - Raw Excel Data: " . json_encode($rowData)); // Log raw data


            // Map Excel columns to variables
            $excel_fecha_compras = $rowData[0]; // Column B (index 0 in 0-based array from range)
            $excel_n_oca = $rowData[1];       // Column C (index 1)
            $excel_valor_oca = $rowData[2];   // Column D (index 2)
            $excel_factura_num = $rowData[3]; // Column E (index 3)
            $excel_proveedor = $rowData[4];   // Column F (index 4)
            $excel_proceso = $rowData[5];     // Column G (index 5)
            $excel_acta_num = $rowData[6];    // Column H (index 6)
            $excel_monto_factura = $rowData[7]; // Column I (index 7)
            $excel_fecha_factura = $rowData[8]; // Column J (index 8)
            $excel_observacion = $rowData[9]; // Column K (index 9)

            // --- Data Cleaning and Validation ---
            $fechaCompras = null;
            $trimmed_excel_fecha_compras = trim((string)$excel_fecha_compras); // Cast to string
            if (!empty($trimmed_excel_fecha_compras)) {
                 if (is_numeric($excel_fecha_compras)) { // Check if it's an Excel date serial number
                    try {
                        $fechaCompras = Date::excelToDateTimeObject($excel_fecha_compras)->format('Y-m-d');
                    } catch (\PhpOffice\PhpSpreadsheet\Calculation\Exception $e) {
                        $errors[] = "Fila $row: Fecha a Compras ('" . htmlspecialchars($excel_fecha_compras) . "') con formato numérico inválido. Se dejará vacía.";
                        // No continuar, $fechaCompras permanece null
                    }
                 } else { // Try to parse as string date
                     try {
                         $dateObj = new DateTime(trim($excel_fecha_compras));
                         $fechaCompras = $dateObj->format('Y-m-d');
                     } catch (\Exception $e) {
                         $errors[] = "Fila $row: Fecha a Compras ('" . htmlspecialchars($excel_fecha_compras) . "') con formato de texto inválido. Se dejará vacía.";
                         // No continuar, $fechaCompras permanece null
                     }
                 }
            } // Si está vacío, $fechaCompras permanece null

             // $oca_numero = null; // No longer primary, derived if needed
            // $anio_oca = null;   // No longer primary, derived if needed
            $oca_valor_final_a_insertar = null; // This will hold "OCA-NUMERO/AÑO"
            $trimmed_excel_n_oca = trim((string)$excel_n_oca); // Cast to string
            if (!empty($trimmed_excel_n_oca)) {
                $nOcaParts = explode('/', $trimmed_excel_n_oca);
                if (count($nOcaParts) === 2) {
                    $parsed_oca_numero = trim($nOcaParts[0]);
                    $parsed_anio_oca = filter_var(trim($nOcaParts[1]), FILTER_VALIDATE_INT);
                    if ($parsed_oca_numero !== '' && $parsed_anio_oca !== false && $parsed_anio_oca > 0) {
                         // $oca_numero = $parsed_oca_numero; // Store if needed for other logic, but not for direct insert
                        // $anio_oca = $parsed_anio_oca;     // Store if needed for other logic, but not for direct insert
                        $oca_valor_final_a_insertar = "OCA-" . $parsed_oca_numero . "/" . $parsed_anio_oca;
                    } else {
                        $errors[] = "Fila $row: Formato de N° OCA inválido ('" . htmlspecialchars($excel_n_oca) . "'). Esperado: NUMERO/AÑO. Se dejará vacío.";
                    }
                } else {
                    $errors[] = "Fila $row: Formato de N° OCA inválido ('" . htmlspecialchars($excel_n_oca) . "'). Esperado: NUMERO/AÑO. Se dejará vacío.";
                }
            } // Si está vacío, $oca_valor_final_a_insertar permanece null

            $valor_oca = null;
            $trimmed_excel_valor_oca = trim((string)$excel_valor_oca); // Cast to string
            if ($trimmed_excel_valor_oca !== '') {
                $parsed_valor_oca = filter_var($trimmed_excel_valor_oca, FILTER_VALIDATE_FLOAT);
                if ($parsed_valor_oca !== false && $parsed_valor_oca >= 0) {
                    $valor_oca = $parsed_valor_oca;
                } else {
                    $errors[] = "Fila $row: Valor de OCA inválido ('" . htmlspecialchars($excel_valor_oca) . "'). Se dejará vacío.";
                }
            } // Si está vacío o inválido, $valor_oca permanece null

            $numero_factura = trim((string)$excel_factura_num); // Cast to string
            if (empty($numero_factura)) {
                $numero_factura = null;
            }

            $idProveedorLookup = null;
            $proveedorName = trim((string)$excel_proveedor); // Cast to string
            if (!empty($proveedorName)) {
                $idProveedorLookup = $providers[mb_strtolower($proveedorName)] ?? null;
                if ($idProveedorLookup === null) {
                    $errors[] = "Fila $row: Proveedor '" . htmlspecialchars($proveedorName) . "' no encontrado. Se dejará sin asignar.";
                }
            } // Si está vacío o no se encuentra, $idProveedorLookup permanece null

            $proceso_numero = null;
            $proceso_dom = trim((string)$excel_proceso); // Cast to string
            if (!empty($proceso_dom)) {
                if (preg_match('/^DOM-CD-(\d+)\/\d+-ADM$/', $proceso_dom, $matches)) {
                    $proceso_numero = $matches[1]; // No se usa en el insert actual, pero se parsea
                } else {
                    $errors[] = "Fila $row: Formato de Proceso DOM ('" . htmlspecialchars($proceso_dom) . "') inválido. Se usará el valor original si no está vacío.";
                }
            } else {
                $proceso_dom = null;
            }

            $numero_acta = trim((string)$excel_acta_num); // Cast to string
            if (empty($numero_acta)) {
                $numero_acta = null;
            }

            $monto_factura = null;
            $trimmed_excel_monto_factura = trim((string)$excel_monto_factura); // Cast to string
            if ($trimmed_excel_monto_factura !== '') {
                $parsed_monto_factura = filter_var($trimmed_excel_monto_factura, FILTER_VALIDATE_FLOAT);
                if ($parsed_monto_factura !== false && $parsed_monto_factura >= 0) {
                    $monto_factura = $parsed_monto_factura;
                } else {
                    $errors[] = "Fila $row: Monto de Factura inválido ('" . htmlspecialchars($excel_monto_factura) . "'). Se dejará vacío.";
                }
            } // Si está vacío o inválido, $monto_factura permanece null

            $fecha_factura = null;
            $trimmed_excel_fecha_factura = trim((string)$excel_fecha_factura); // Cast to string
            if (!empty($trimmed_excel_fecha_factura)) {
                 if (is_numeric($excel_fecha_factura)) { // Check if it's an Excel date serial number
                    try {
                        $fecha_factura = Date::excelToDateTimeObject($excel_fecha_factura)->format('Y-m-d');
                    } catch (\PhpOffice\PhpSpreadsheet\Calculation\Exception $e) {
                        $errors[] = "Fila $row: Fecha Factura ('" . htmlspecialchars($excel_fecha_factura) . "') con formato numérico inválido. Se dejará vacía.";
                    }
                 } else { // Try to parse as string date
                     try {
                         $dateObj = new DateTime(trim($excel_fecha_factura));
                         $fecha_factura = $dateObj->format('Y-m-d');
                     } catch (\Exception $e) {
                         $errors[] = "Fila $row: Fecha Factura ('" . htmlspecialchars($excel_fecha_factura) . "') con formato de texto inválido. Se dejará vacía.";
                     }
                 }
            } // Si está vacío, $fecha_factura permanece null

            $observaciones = trim((string)$excel_observacion); // Cast to string

            // Calculate derived fields
            $iva_retenido_factura = 0;
            $total_factura = 0;
            if ($monto_factura !== null) {
                if ($monto_factura >= 113) {
                    $iva_retenido_factura = round(($monto_factura / 1.13) * 0.01, 2);
                }
                $total_factura = round($monto_factura - $iva_retenido_factura, 2);
            } else {
                $iva_retenido_factura = null; // O 0.00 si la columna no permite null
                $total_factura = null;      // O 0.00
            }

            // Simple number to letters conversion (consider a more robust library if needed)
            // For simplicity in backend, let's just store the number and rely on frontend for letters if needed.
            // Or implement a PHP number-to-words function. Let's skip letters for now in backend import.

            $total_factura_letras = ''; // Or implement conversion


            // --- Crucial Duplicate Check ---
            $duplicateCheckKey = mb_strtolower($oca_valor_final_a_insertar ?? '') . '|' . mb_strtolower($numero_acta ?? '');
            if (isset($existingOcas[$duplicateCheckKey])) {
                $existingState = $existingOcas[$duplicateCheckKey];
                if ($existingState != ID_ESTADO_OBSERVADA) {
                    $errors[] = "Fila $row: Duplicado encontrado. OCA '$oca_valor_final_a_insertar' con Acta '$numero_acta' ya existe y su estado NO es 'Observada'.";
                    $skippedRows[] = $row;
                    continue; // Skip row
                }
                // If state IS Observada, we allow insertion (as per ingresarOca.php logic)
            }


            // --- Add to batch insert data ---
            $dataToInsert[] = [
                // 'idProyecto' => $idProyecto, // Eliminado
                'oca_a_insertar' => $oca_valor_final_a_insertar, // Nuevo campo para el valor consolidado
                'proceso_dom' => $proceso_dom,
                'valor_oca' => $valor_oca,
                'numero_acta' => $numero_acta,
                'idProveedor' => $idProveedorLookup,
                'fecha_factura' => $fecha_factura,
                'numero_factura' => $numero_factura,
                'monto_factura' => $monto_factura,
                'iva_retenido_factura' => $iva_retenido_factura,
                'total_factura' => $total_factura,
                'total_factura_letras' => $total_factura_letras, // Will be empty string
                'fechaCompras' => $fechaCompras,
                'idUsuario_registro' => $usuario_id,
                'impresa' => 0,
                'idEstado_Oca' => $idEstado_Oca,
                'observaciones' => $observaciones
            ];
            error_log("DEBUG Fila $row - Processed Data for Insert: " . json_encode($dataToInsert[count($dataToInsert)-1])); // Log processed data

        } // End of row loop

        $response['processed_rows'] = $processedRowCount;
        $response['skipped_count'] = count($skippedRows);
        $response['errors'] = $errors;

        // --- Database Insertion (within transaction) ---
        if (!empty($dataToInsert)) {
            $mysqli->begin_transaction();
            $insertedCount = 0;
            $insertedIds = []; // To store IDs for history

            // Prepare the insert statement once
            $insertQuery = "INSERT INTO control_ocas
                            (fechaCompras, oca, valor_oca, numero_factura, idProveedor,
                             proceso_dom,  numero_acta, monto_factura, fecha_factura, observaciones, impresa, idEstado_Oca)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"; // 12 placeholders
            $stmtInsert = $mysqli->prepare($insertQuery);

            if ($stmtInsert) {
                foreach ($dataToInsert as $rowData) {
                    // Bind parameters for each row
                    $stmtInsert->bind_param("ssddisidssii", // Corrected 18-char type string
                        $rowData['fechaCompras'],
                        $rowData['oca_a_insertar'], // OCA-NUMERO/AÑO
                        $rowData['valor_oca'],
                        $rowData['numero_factura'],
                        $rowData['idProveedor'],
                        $rowData['proceso_dom'],
                        $rowData['numero_acta'],
                        $rowData['monto_factura'],
                        $rowData['fecha_factura'],
                        $rowData['observaciones'],
                        $rowData['impresa'],
                        $rowData['idEstado_Oca'],
                    );

                    if ($stmtInsert->execute()) {
                        $insertedCount++;
                        $insertedIds[] = $mysqli->insert_id; // Get the ID of the newly inserted row
                    } else {
                        // Log specific insertion error, but don't stop the batch
                        $errors[] = "Error al insertar fila (OCA: " . htmlspecialchars($rowData['oca_a_insertar']) . ", Acta: " . htmlspecialchars($rowData['numero_acta']) . "): " . $stmtInsert->error;
                        error_log("Batch Insert Error: " . $stmtInsert->error . " for data: " . json_encode($rowData));
                         // Decide if a single row error should rollback the whole transaction
                         // For now, let's continue and report errors, but rollback if any execute fails.
                         // A better approach might be to collect errors and rollback only if critical.
                         // Let's modify to rollback on *any* execute error for safety.
                         $mysqli->rollback();
                         $response['message'] = "Error al insertar una fila. La transacción fue revertida. Detalles: " . $stmtInsert->error;
                         $response['errors'] = $errors; // Include collected errors up to this point
                         $stmtInsert->close();
                         $mysqli->close();
                         echo json_encode($response);
                         exit; // Stop processing on first insert error
                    }
                } // End of dataToInsert loop
                $stmtInsert->close();

                // --- History Logging (Optional but Recommended) ---
                $tipo_accion = "importar_excel_oca";
                $tabla_afectada = "control_ocas";
                $datos_anteriores = null; // No previous data for insert

                $stmtHistory = $mysqli->prepare("INSERT INTO historial_cambios (idUsuario, tipo_accion, tabla_afectada, id_registro_afectado, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)");
                if ($stmtHistory) {
                    foreach ($insertedIds as $insertedId) {
                        // You might want to fetch the actual inserted data for 'datos_nuevos'
                        // For simplicity, let's just log the action and the ID
                         $log_datos_nuevos = json_encode(['idOca' => $insertedId, 'source' => 'excel_import']); // Simple log
                        $stmtHistory->bind_param("ississ", $usuario_id, $tipo_accion, $tabla_afectada, $insertedId, $datos_anteriores, $log_datos_nuevos);
                        if (!$stmtHistory->execute()) {
                            error_log("Error logging history for imported OCA ID $insertedId: " . $stmtHistory->error);
                        }
                    }
                    $stmtHistory->close();
                } else {
                    error_log("Error preparing history insert statement: " . $mysqli->error);
                }
                // --- End History Logging ---


                $mysqli->commit(); // Commit the transaction
                $response['success'] = true;
                $response['inserted_count'] = $insertedCount;
                $response['message'] = "Proceso de carga finalizado.";
                if ($insertedCount > 0) {
                     $response['message'] .= " Se insertaron $insertedCount fila(s).";
                }
                if ($response['skipped_count'] > 0) {
                    $response['message'] .= " Se omitieron " . $response['skipped_count'] . " fila(s) por duplicado o estado no permitido.";
                }
                if (!empty($response['errors'])) {
                     $response['message'] .= " Se encontraron errores/advertencias en " . count($response['errors']) . " fila(s) (algunas pudieron ser insertadas con datos faltantes o por defecto).";
                }


            } else {
                // Error preparing the insert statement
                $mysqli->rollback(); // Rollback if transaction was started
                $response['message'] = "Error al preparar la sentencia de inserción: " . $mysqli->error;
                error_log("Batch Insert Prepare Error: " . $mysqli->error);
            }

        } else {
            // No data to insert after processing
            $response['success'] = true; // Consider it a success if no data was found or all skipped
            $response['message'] = "No se encontraron datos válidos para insertar en el archivo.";
             if ($response['skipped_count'] > 0) {
                $response['message'] .= " Se omitieron " . $response['skipped_count'] . " fila(s) por duplicado o estado no permitido.";
            }
            if (!empty($response['errors'])) {
                 $response['message'] .= " Se encontraron errores/advertencias en " . count($response['errors']) . " fila(s).";
            }
        }


    } catch (\PhpOffice\PhpSpreadsheet\Exception $e) {
        $response['message'] = 'Error al leer el archivo Excel: ' . $e->getMessage();
        error_log("PhpSpreadsheet Error: " . $e->getMessage());
    } catch (\Exception $e) {
        $response['message'] = 'Error general durante el procesamiento: ' . $e->getMessage();
        error_log("General Processing Error: " . $e->getMessage());
    }

    $mysqli->close();
    echo json_encode($response);
    exit;
}
// --- End AJAX POST Request Handling ---


// --- Regular GET Request (Display Form) ---
include_once "header.php";
include_once "navbar.php";

// Fetch projects for the select dropdown
$proyectos = [];
$resultProyectos = $mysqli->query("SELECT codigoProyecto, nombreProyecto FROM proyectos ORDER BY codigoProyecto ASC");
if ($resultProyectos) {
    $proyectos = $resultProyectos->fetch_all(MYSQLI_ASSOC);
    $resultProyectos->free();
} else {
    // Handle error loading projects
    $error_message = "Error al cargar la lista de proyectos: " . $mysqli->error;
    error_log($error_message);
    // Display an error message to the user or handle appropriately
}

// Fetch OCA states for the select dropdown
$estadosOca = [];
$resultEstados = $mysqli->query("SELECT idEstado_Oca, estadoOca FROM estado_oca ORDER BY estadoOca ASC");
if ($resultEstados) {
    $estadosOca = $resultEstados->fetch_all(MYSQLI_ASSOC);
    $resultEstados->free();
} else {
    // Handle error loading states
    $error_message = "Error al cargar la lista de estados de OCA: " . $mysqli->error;
    error_log($error_message);
    // Display an error message to the user or handle appropriately
}

$mysqli->close(); // Close connection after fetching data for the form

?>

<div class="content-wrapper">
    <section class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1>Cargar Órdenes de Compra desde Excel</h1>
                </div>
            </div>
        </div>
    </section>

    <section class="content">
        <div class="container-fluid">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="card card-primary">
                        <div class="card-header">
                            <h3 class="card-title">Seleccionar Archivo y Opciones</h3>
                        </div>
                        <form id="uploadExcelForm" enctype="multipart/form-data">
                            <div class="card-body">
                                <div class="form-group">
                                    <label for="excel_file">Seleccionar archivo Excel (.xlsx, .xls):</label>
                                    <div class="input-group">
                                        <div class="custom-file">
                                            <input type="file" class="custom-file-input" id="excel_file" name="excel_file" accept=".xlsx, .xls" required>
                                            <label class="custom-file-label" for="excel_file">Elegir archivo</label>
                                        </div>
                                    </div>
                                    <small class="form-text text-muted">Asegúrese de que la hoja de datos se llame "consolidado" y que los datos comiencen en la celda B2.</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="idEstado_Oca">Asignar Estado:</label>
                                    <select class="form-control" id="idEstado_Oca" name="idEstado_Oca" required>
                                        <option value="">-- Seleccione un Estado --</option>
                                        <?php foreach ($estadosOca as $estadoItem): ?>
                                            <option value="<?php echo $estadoItem['idEstado_Oca']; ?>"><?php echo htmlspecialchars($estadoItem['estadoOca']); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <div class="invalid-feedback">Por favor, seleccione un estado.</div>
                                </div>
                            </div>
                            <div class="card-footer">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-upload mr-1"></i> Cargar Datos
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
             <div class="row justify-content-center">
                <div class="col-md-8">
                    <div id="uploadStatus" class="mt-3" style="display:none;">
                        <h4>Estado de la Carga</h4>
                        <div id="statusMessage" class="alert" role="alert"></div>
                        <div id="errorDetails" class="mt-2"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<?php include_once "footer.php"; ?>

<script>
$(document).ready(function() {
    // Update the custom file input label
    $('#excel_file').on('change', function() {
        var fileName = $(this).val().split('\\').pop();
        $(this).siblings('.custom-file-label').addClass("selected").html(fileName);
    });

    $('#uploadExcelForm').on('submit', function(e) {
        e.preventDefault();

        const form = this;
        const formData = new FormData(form);
        const submitButton = $(form).find('button[type="submit"]');
        const originalButtonHtml = submitButton.html();
        const uploadStatusDiv = $('#uploadStatus');
        const statusMessageDiv = $('#statusMessage');
        const errorDetailsDiv = $('#errorDetails');

        // Reset status display
        uploadStatusDiv.hide();
        statusMessageDiv.removeClass('alert-success alert-danger alert-warning alert-info').html('');
        errorDetailsDiv.html('');

        // Basic form validation (solo para archivo y estado ahora)
        if (!form.checkValidity()) {
            $(form).addClass('was-validated');
            return;
        }
        $(form).addClass('was-validated');


        // Disable button and show loading
        submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando...');

        // Show initial status message
        uploadStatusDiv.show();
        statusMessageDiv.addClass('alert-info').html('Procesando archivo...');


        $.ajax({
            url: 'cargarExcelOcas.php', // Post to the same file
            type: 'POST',
            data: formData,
            processData: false, // Important for FormData
            contentType: false, // Important for FormData
            dataType: 'json', // Expect JSON response
            success: function(response) {
                if (response.success) {
                    statusMessageDiv.removeClass('alert-info').addClass('alert-success').html(response.message);
                } else {
                    statusMessageDiv.removeClass('alert-info').addClass('alert-danger').html(response.message);
                }

                // Display errors/warnings if any
                if (response.errors && response.errors.length > 0) {
                    let errorHtml = '<h5>Detalles:</h5><ul>';
                    response.errors.forEach(err => {
                        errorHtml += `<li>${htmlspecialchars(err)}</li>`;
                    });
                    errorHtml += '</ul>';
                    errorDetailsDiv.html(errorHtml);
                }

                // Optional: Reset form after successful upload
                if (response.success) {
                    form.reset();
                    $(form).removeClass('was-validated');
                    $('#excel_file').siblings('.custom-file-label').html('Elegir archivo'); // Reset file label
                }
            },
            error: function(xhr, status, error) {
                console.error("Upload Error:", status, error, xhr.responseText);
                statusMessageDiv.removeClass('alert-info').addClass('alert-danger').html('Error de comunicación con el servidor.');
                 if (xhr.responseText) {
                     errorDetailsDiv.html('<h5>Respuesta del servidor:</h5><pre>' + htmlspecialchars(xhr.responseText.substring(0, 500)) + '...</pre>');
                 }
            },
            complete: function() {
                submitButton.prop('disabled', false).html(originalButtonHtml);
            }
        });
    });

     // Helper function to escape HTML for displaying errors
     function htmlspecialchars(str) {
         return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
     }

});
</script>

<?php
// No close $mysqli here if it was closed in the POST block
// If it wasn't closed in the POST block (e.g., due to an early exit),
// and it was opened in the GET block, it should be closed here.
// In the current structure, it's opened and closed within the POST block
// or opened and closed within the GET block. So no extra close needed here.
?>