<?php
// c:\UniServerZ\www\facturacion\subset_sum_web.php

error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * Encuentra una combinación de montos que sumen el monto total deseado.
 * Implementación básica del Subset Sum Problem usando backtracking.
 *
 * @param array $montosDisponibles Array de los montos individuales disponibles.
 * @param float $montoTotalBuscado El monto total que se desea alcanzar.
 * @param int $indice El índice actual que se está considerando en $montosDisponibles (para uso recursivo).
 * @param array $combinacionActual La combinación de montos que se está construyendo (para uso recursivo).
 * @return array La combinación de montos que suma el total, o un array vacío si no se encuentra.
 */
function encontrarCombinacionSuma(array $montosDisponibles, float $montoTotalBuscado, int $indice = 0, array $combinacionActual = []): array {
    // Calcular la suma de la combinación actual
    // Usamos un pequeño margen de tolerancia para comparaciones de flotantes
    $sumaActual = array_sum($combinacionActual);
    $epsilon = 0.0001; // Tolerancia para flotantes

    // Caso base 1: Se encontró una combinación que suma el total (dentro de la tolerancia)
    if (abs($sumaActual - $montoTotalBuscado) < $epsilon) {
        return $combinacionActual;
    }

    // Caso base 2: La suma actual excede el total (considerando tolerancia) o ya no hay más montos para considerar
    if ($sumaActual > $montoTotalBuscado + $epsilon || $indice >= count($montosDisponibles)) {
        return []; // No se encontró una solución por este camino
    }

    // Opción 1: Incluir el monto actual en la combinación
    $combinacionConMontoActual = $combinacionActual;
    $combinacionConMontoActual[] = $montosDisponibles[$indice];
    $resultadoIncluyendo = encontrarCombinacionSuma($montosDisponibles, $montoTotalBuscado, $indice + 1, $combinacionConMontoActual);

    if (!empty($resultadoIncluyendo)) {
        return $resultadoIncluyendo; // Se encontró una solución incluyendo el monto actual
    }

    // Opción 2: Excluir el monto actual de la combinación (probar con el siguiente monto)
    $resultadoExcluyendo = encontrarCombinacionSuma($montosDisponibles, $montoTotalBuscado, $indice + 1, $combinacionActual);

    if (!empty($resultadoExcluyendo)) {
        return $resultadoExcluyendo; // Se encontró una solución excluyendo el monto actual
    }

    return []; // No se encontró solución por ninguna de las dos opciones
}

$montoTotalObjetivo = null;
$listaDeMontos = [];
$combinacionEncontrada = null;
$error = null;

// Procesar el formulario si se ha enviado
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Obtener y validar el monto total objetivo
    $montoTotalObjetivo = filter_input(INPUT_POST, 'monto_total', FILTER_VALIDATE_FLOAT);
    if ($montoTotalObjetivo === false || $montoTotalObjetivo === null || $montoTotalObjetivo < 0) {
        $error = "Por favor, ingrese un monto total objetivo válido y positivo.";
    }

    // 2. Obtener y procesar la lista de montos disponibles
    $montosInput = filter_input(INPUT_POST, 'montos_disponibles', FILTER_UNSAFE_RAW);
    if ($montosInput === null || trim($montosInput) === '') {
        $error = ($error ?? '') . " Por favor, ingrese la lista de montos disponibles (uno por línea).";
    } else {
        // Dividir la entrada por saltos de línea, limpiar espacios y convertir a flotantes
        $lineas = explode("\n", $montosInput);
        foreach ($lineas as $linea) {
            $monto = trim($linea);
            if ($monto !== '') {
                $montoFloat = filter_var($monto, FILTER_VALIDATE_FLOAT);
                if ($montoFloat !== false && $montoFloat !== null && $montoFloat > 0) {
                    $listaDeMontos[] = $montoFloat;
                } else {
                    // Opcional: Mostrar advertencia por montos inválidos en la lista
                    // $error = ($error ?? '') . " Advertencia: El valor '" . htmlspecialchars($monto) . "' en la lista no es un monto válido y será ignorado.";
                }
            }
        }
        if (empty($listaDeMontos)) {
             $error = ($error ?? '') . " No se encontraron montos válidos en la lista proporcionada.";
        }
    }

    // 3. Si no hay errores de validación, intentar encontrar la combinación
    if ($error === null && !empty($listaDeMontos) && $montoTotalObjetivo !== null) {
         // Opcional: Ordenar la lista de montos para posible optimización (ver comentarios en la función)
         // rsort($listaDeMontos); // Ordenar descendentemente

        $combinacionEncontrada = encontrarCombinacionSuma($listaDeMontos, $montoTotalObjetivo);
    }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Encontrar Combinación de Montos</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" integrity="sha384-xOolHFLEh07PJGoPkLv1IbcEPTNtaed2xpHsD9ESMhqIYd0nLMwNLD69Npy4HI+N" crossorigin="anonymous">
    <style>
        body {
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin-top: 20px;
        }
        textarea {
            min-height: 150px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">Encontrar Combinación de Montos</h1>

        <?php if ($error): ?>
            <div class="alert alert-danger" role="alert">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label for="monto_total">Monto Total Objetivo:</label>
                <input type="number" class="form-control" id="monto_total" name="monto_total" step="0.01" required value="<?php echo htmlspecialchars($montoTotalObjetivo ?? ''); ?>">
            </div>
            <div class="form-group">
                <label for="montos_disponibles">Montos Disponibles (uno por línea):</label>
                <textarea class="form-control" id="montos_disponibles" name="montos_disponibles" required><?php
                    if (!empty($listaDeMontos)) {
                        echo htmlspecialchars(implode("\n", $listaDeMontos));
                    }
                ?></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Buscar Combinación</button>
        </form>

        <?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && $error === null): ?>
            <h2 class="mt-4">Resultado</h2>
            <?php if (!empty($combinacionEncontrada)): ?>
                <div class="alert alert-success" role="alert">
                    <p>Se encontró una combinación que suma <strong>$<?php echo number_format($montoTotalObjetivo, 2, '.', ','); ?></strong>:</p>
                    <p>[ <?php echo htmlspecialchars(implode(", ", $combinacionEncontrada)); ?> ]</p>
                    <p>Suma de la combinación: <strong>$<?php echo number_format(array_sum($combinacionEncontrada), 2, '.', ','); ?></strong></p>
                </div>
            <?php else: ?>
                <div class="alert alert-warning" role="alert">
                    No se encontró ninguna combinación de los montos proporcionados que sume <strong>$<?php echo number_format($montoTotalObjetivo, 2, '.', ','); ?></strong>.
                </div>
            <?php endif; ?>
        <?php endif; ?>

    </div>
</body>
</html>