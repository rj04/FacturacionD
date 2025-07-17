<?php
require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill; // Import the Fill class
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing; // Import the Drawing class
use PhpOffice\PhpSpreadsheet\Style\Alignment; // Import the Alignment class
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Worksheet\Table;
use PhpOffice\PhpSpreadsheet\Worksheet\Table\TableStyle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Color;

function aplicarEstilosEquipos($hoja) {
    $columnas = ['CODIGO DE PROYECTO', 'EQUIPO', 'CODIGO ACTIVO FIJO', 'CANTIDAD', 'FECHA DE INGRESO AL PROYECTO', 'PROVEEDOR O PROYECTO DE PROCEDENCIA', 'OCA', 'ESTADO', 'PROYECTO AL QUE SE MOVIO'];

        /* estilo para las columnas */
            // Establecer los anchos de las columnas
            $hoja->getColumnDimension('A')->setAutoSize(false);
            $hoja->getColumnDimension('A')->setWidth(4.43);
            $hoja->getColumnDimension('B')->setAutoSize(false);
            $hoja->getColumnDimension('B')->setWidth(13.43);
            $hoja->getColumnDimension('C')->setAutoSize(false);
            $hoja->getColumnDimension('C')->setWidth(35.29);
            $hoja->getColumnDimension('D')->setAutoSize(false);
            $hoja->getColumnDimension('D')->setWidth(18.29);
            $hoja->getColumnDimension('E')->setAutoSize(false);
            $hoja->getColumnDimension('E')->setWidth(9.86);
            $hoja->getColumnDimension('F')->setAutoSize(false);
            $hoja->getColumnDimension('F')->setWidth(16.43);
            $hoja->getColumnDimension('G')->setAutoSize(false);
            $hoja->getColumnDimension('G')->setWidth(47.00);
            $hoja->getColumnDimension('H')->setAutoSize(false);
            $hoja->getColumnDimension('H')->setWidth(16.00);
            $hoja->getColumnDimension('I')->setAutoSize(false);
            $hoja->getColumnDimension('I')->setWidth(14.57);
            $hoja->getColumnDimension('J')->setAutoSize(false);
            $hoja->getColumnDimension('J')->setWidth(35.14);

            $hoja->getStyle('D1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('92d050');
            $hoja->setCellValue('E1', 'Activo en proyecto');
            $hoja->getStyle('D2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFF00');
            $hoja->setCellValue('E2', 'Trasladado a otro proyecto');
                    
            // Merge cells B3 to J3
            $hoja->mergeCells('B3:J3');

            // Insert the image
            $drawing = new Drawing();
            $drawing->setName('Logo');
            $drawing->setDescription('LOGO-DOM');
            $drawing->setPath(__DIR__ . '/../images/LOGO-DOM.png'); // Path to the image
            $drawing->setHeight(50); // Set the height of the image
            $drawing->setCoordinates('C3'); // Set the position of the image
            // Opcional: Desplazar más hacia la derecha dentro de la celda
            $drawing->setOffsetX(30); // Desplazamiento horizontal en px
            $drawing->setOffsetY(15); // Desplazamiento horizontal en px
            $drawing->setWorksheet($hoja);

            // Add text in bold
            $hoja->setCellValue('B3', 'INSPECCIÓN DE BODEGA EN PROYECTOS POR ADMINISTRACIÓN');
            $hoja->getStyle('B3')->getFont()->setBold(true);
            $hoja->getStyle('B3')->getFont()->setSize(12);
            $hoja->getStyle('B3')->getFont()->setName('Arial');
            $hoja->getStyle('B3')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $hoja->getStyle('B3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $hoja->getRowDimension(3)->setRowHeight(60);

            // Combinar celdas de B4 a J4
            $hoja->mergeCells('B4:J4');
            $hoja->getStyle('B4')->getFont()->setSize(12);
            $hoja->getStyle('B4')->getFont()->setName('Arial');
            
            // Crear texto con formato mixto
            $richText = new RichText();
            $boldText = $richText->createTextRun('NOMBRE DE TÉCNICO: ');
            $boldText->getFont()->setBold(true);
            $hoja->getStyle('B4')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            $normalText = $richText->createTextRun('WALTER ORLANDO DELGADO ORTIZ - SERGIO VLADIMIR RODRIGUEZ ASCENCIO');

            $hoja->setCellValue('B4', $richText);
            $hoja->getRowDimension(4)->setRowHeight(47.25);

            // Combinar celdas de B5 a D5
            $hoja->mergeCells('B5:D5');
            $hoja->getStyle('B5')->getFont()->setSize(12);  
            $hoja->getStyle('B5')->getFont()->setName('Arial');         
            $hoja->mergeCells('E5:G5');
            $hoja->getStyle('E5')->getFont()->setSize(12);
            $hoja->getStyle('E5')->getFont()->setName('Arial');         
            $hoja->mergeCells('H5:J5');
            $hoja->getStyle('H5')->getFont()->setSize(12);
            $hoja->getStyle('H5')->getFont()->setName('Arial');         
            
            // Crear texto
            $richFecha = new RichText();
            $boldText = $richFecha->createTextRun('FECHA DE VISITA: ');
            $boldText->getFont()->setBold(true);
            $hoja->getStyle('B5')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $hoja->setCellValue('B5', $richFecha);

            $richFirma = new RichText();
            $boldText = $richFirma->createTextRun('FIRMA: ');
            $boldText->getFont()->setBold(true);
            $hoja->getStyle('E5')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $hoja->setCellValue('E5', $richFirma);

            $richEquipo = new RichText();
            $boldText = $richEquipo->createTextRun('EQUIPOS');
            $boldText->getFont()->setBold(true);
            $hoja->getStyle('H5')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $hoja->getStyle('H5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $hoja->setCellValue('H5', $richEquipo);
            $hoja->getRowDimension(5)->setRowHeight(99.75);


            // Merge cells B6 to J6
            $hoja->mergeCells('B6:J6');
            // Add text in bold
            $hoja->setCellValue('B6', 'PROYECTO ' . $codigo . ' ' . $nombre);
            
            $hoja->getStyle('B6')->getFont()->setBold(true);
            $hoja->getStyle('B6')->getFont()->setSize(11);
            $hoja->getStyle('B6')->getFont()->setName('Arial');         
            $hoja->getStyle('B6')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $hoja->getStyle('B6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $hoja->getRowDimension(6)->setRowHeight(33);


            // Merge cells B7 to J7
            $hoja->mergeCells('B7:J7');
            $hoja->getStyle('B7')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('BDD7ee');
            // Add text in bold
            $hoja->setCellValue('B7', 'REGISTRO');
            $hoja->getStyle('B7')->getFont()->setBold(true);
            $hoja->getStyle('B7')->getFont()->setSize(11);
            $hoja->getStyle('B7')->getFont()->setName('Arial');         
            $hoja->getStyle('B7')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $hoja->getStyle('B7')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $hoja->getRowDimension(7)->setRowHeight(28.5);

        /** finaliza el estilo para las columas */

        // Número de columnas
        // Determinar el número de columnas
        $numColumnas = count($columnas);

        // Generar las letras dinámicamente para las columnas, comenzando desde 'B'
        $letras = [];
        $maxColumnas = 52; // Para columnas de 'A' a 'AZ'

        for ($i = 0; $i < $numColumnas; $i++) {
            if ($i < 26) {
                $letras[] = chr(66 + $i);  // Letras de 'B' a 'Z'
            } else {
                $letras[] = 'A' . chr(65 + ($i - 26));  // Letras de 'AA' a 'AZ'
            }
        }
        
        /*echo "Título de hoja actual: $tituloHoja\n";
        print_r($columnas);*/

        // Asignar las cabeceras
        $hoja->fromArray($columnas, null, 'B8');

        // Insertar datos
        $fila = 9;
        while ($dataRow = $dataResult->fetch_assoc()) {
            foreach (array_values($dataRow) as $i => $valor) {
                // Verifica que no haya acceso fuera de rango
                if (isset($letras[$i])) {
                    $hoja->setCellValue($letras[$i] . $fila, $valor);
                }
            }
            $fila++;
        }

        // Insertar datos
        $fila = 9; // Comenzar en la fila 9
        while ($dataRow = $dataResult->fetch_assoc()) {
            foreach (array_values($dataRow) as $i => $valor) {
                // Verifica que no haya acceso fuera de rango
                if (isset($letras[$i])) {
                    $hoja->setCellValue($letras[$i] . $fila, $valor); // Escribir datos en fila correspondiente
                }
            }
            $fila++;
        }

        // Ajustar el tamaño de la fila 8 de acuerdo al contenido de sus celdas
        $hoja->getRowDimension(8)->setRowHeight(-1);  // Esto ajustará automáticamente la altura de la fila al contenido de la fila 8



        // Agregar bordes a la tabla 1 (B3:J6)
        $hoja->getStyle('B3:J6')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // Aplicar estilo para "EQUIPOS" // Definir el rango para la tabla
        $tableRange = 'B8:J' . ($fila - 1); // Considera la última fila con datos
        $styleArray = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => '000'],
                'size' => 10,
                'name' => 'Arial'
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '000']
            ],
        ];
        
        // Aplica un estilo personalizado a la tabla
        $hoja->getStyle($tableRange)->applyFromArray($styleArray);
            
        // Otros estilos para "EQUIPOS", como color de encabezados
        $hoja->getStyle('B7:J7')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID);
        $hoja->getStyle('B7:J7')->getFill()->getStartColor()->setRGB('BDD7EE'); // Color de fondo

        // Aplicar estilo a la fila de encabezados
        $estiloEncabezado = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 10,
                'name' => 'Arial'
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                ],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '203764'],
            ],
        ];

        // Aplicar el estilo a la fila 8
        $hoja->getStyle('B8:J8')->applyFromArray($estiloEncabezado);

        // Recorrer las filas desde la 8 hasta la última fila con datos
        $ultimaFila = $hoja->getHighestRow();  // Obtiene la última fila con datos

        for ($fila = 9; $fila <= $ultimaFila; $fila++) {
            // Determinar si la fila es par o impar
            if ($fila % 2 == 0) {
                // Fila par (color: #D9E1F2)
                $hoja->getStyle('B' . $fila . ':J' . $fila)->applyFromArray([
                    'fill' => [
                        'type' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'color' => ['rgb' => 'D9E1F2'],
                    ],
                ]);
            } else {
                // Fila impar (color: #FFFFFF)
                $hoja->getStyle('B' . $fila . ':J' . $fila)->applyFromArray([
                    'fill' => [
                        'type' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'color' => ['rgb' => 'FFFFFF'],
                    ],
                ]);
            }
        }
    }
?>