<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start(); // Asegúrate de tener la sesión iniciada para control de acceso

// --- Control de Acceso ---
// Aquí deberías verificar si el usuario actual tiene permiso para gestionar perfiles.
// Por ejemplo, usando una función como usuarioTienePermiso('manage_profiles')
// if (!isset($_SESSION['idUsuario']) /* || !usuarioTienePermiso('manage_profiles') */ ) {
//     header("Location: index.php?error=Acceso denegado");
//     exit;
// }
// --- Fin Control de Acceso ---

$mysqli = include_once "conexion.php";
include_once "header.php";
include_once "navbar.php";

// Obtener lista de perfiles
$resultPerfiles = $mysqli->query("SELECT idPerfil, perfil FROM perfiles ORDER BY perfil ASC");
$perfiles = $resultPerfiles->fetch_all(MYSQLI_ASSOC);

// --- Ya no necesitamos el var_dump ni el exit ---



// --- Definir Estructura del Menú y sus Permisos Asociados ---
// (Basado en tu navbar.php y el script SQL de permisos)
// Clave: Texto del menú, Valor: array con 'permiso' => nombrePermiso o 'submenu' => array
$menuStructure = [
    'Dashboard' => ['permiso' => 'view_dashboard'],
    'Buscar' => [
        'submenu' => [
            'Equipos por Proyecto' => ['permiso' => 'view_equipment_by_project'],
            'Herramientas por Proyecto' => ['permiso' => 'view_tools_by_project'],
            'Materiales por Proyecto' => ['permiso' => 'view_materials_by_project'],
            'OCAS en Ampos' => ['permiso' => 'view_ocas_ampos'],
            'Proyectos' => ['permiso' => 'manage_projects'], // Este permiso cubre la gestión desde la lista
        ]
    ],
    'Ingresos' => [
        'submenu' => [
            'Equipos' => ['permiso' => 'manage_equipment'],
            'Herramientas' => ['permiso' => 'manage_tools'],
            'Materiales' => ['permiso' => 'manage_materials'],
            'Ocas por Proyecto' => ['permiso' => 'manage_ocas_by_project'],
        ]
    ],
    'Cargar Excel' => [
        'submenu' => [
            'Cargar Excel Equipos' => ['permiso' => 'upload_excel_equipment'],
            'Cargar Excel Herramientas' => ['permiso' => 'upload_excel_tools'],
            'Cargar Excel Materiales' => ['permiso' => 'upload_excel_materials'],
            'Cargar Excel Ocas' => ['permiso' => 'upload_excel_ocas'],
        ]
    ],
    'Transferencias' => [
        'submenu' => [
            'Equipos' => ['permiso' => 'transfer_equipment'],
            'Herramientas' => ['permiso' => 'transfer_tools'],
            'Materiales' => ['permiso' => 'transfer_materials'],
        ]
    ],
    'Ordenes de Compra' => [
        'submenu' => [
            'Pagos OCA' => ['permiso' => 'manage_oca_payments'],
            'Registrar OCA' => ['permiso' => 'create_oca'],
            // 'Cargar Excel Ocas' ya está en sección Excel
            'Listar OCAS' => ['permiso' => 'view_ocas'],
        ]
    ],
    'Reportes y Gráficas' => [
        'submenu' => [
            'Generar Reportes' => ['permiso' => 'generate_reports'],
            'Generar Gráficas' => ['permiso' => 'view_charts'],
            'Generar Excel' => ['permiso' => 'generate_excel_reports'],
            // Podrías añadir aquí los view_report_* si quieres control extra fino
        ]
    ],
    'Administración' => [
        'submenu' => [
            'Archivos Excluidos' => ['permiso' => 'manage_exclusions'],
            'Registro de Estados' => ['permiso' => 'manage_states'],
            'Registro Proveedores' => ['permiso' => 'manage_suppliers'],
            'Residentes' => ['permiso' => 'manage_residents'],
            'Bodegueros' => ['permiso' => 'manage_storekeepers'],
            'Gestionar Perfiles' => ['permiso' => 'manage_profiles'], // Controla ambas páginas de perfiles/permisos
            'Gestionar Maquinaria' => ['permiso' => 'manage_machinery'], // Nuevo permiso para gestión de maquinaria
            //'Gestionar Permisos' => ['permiso' => 'manage_profiles'], // Mismo permiso
            'Registro de Usuarios' => ['permiso' => 'manage_users'],
        ]
    ],
    // Configuración usualmente no requiere permisos específicos o son implícitos
];

?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
        <div class="container-fluid">
            <div class="row mb-2">
                <div class="col-sm-6">
                    <h1 class="m-0">Gestionar Permisos por Perfil</h1>
                </div><!-- /.col -->
            </div><!-- /.row -->
        </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <section class="content">
        <div class="container-fluid">
            <!-- *** RESTAURAR ESTE BLOQUE HTML *** -->
            <div class="card card-primary">
                <div class="card-header">
                    <h3 class="card-title">Seleccionar Perfil</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="selectPerfil">Perfil:</label>
                        <select id="selectPerfil" class="form-control">
                            <option value="">-- Seleccione un perfil --</option>
                            <?php foreach ($perfiles as $perfil): ?>
                                <option value="<?php echo $perfil['idPerfil']; ?>">
                                    <?php echo htmlspecialchars($perfil['perfil']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
            </div>
            <!-- *** FIN BLOQUE RESTAURADO *** -->

            <div id="permisosContainer" style="display: none;">
                <div class="card card-info">
                    <div class="card-header">
                        <h3 class="card-title">Permisos para el Perfil: <span id="nombrePerfilSeleccionado"></span></h3>
                    </div>

                    <form id="formPermisos">
                        <input type="hidden" name="idPerfil" id="hiddenIdPerfil">
                        <div class="card-body">
                            <div class="mb-3 text-right"> <!-- Contenedor para el botón -->
                                <button type="button" id="toggleAllPermissionsBtn" class="btn btn-outline-primary btn-sm" data-action="select">Seleccionar Todo</button>
                            </div>
                            <div id="listaPermisos">
                                <!-- Estructura del menú con checkboxes (generada por PHP) -->
                                <?php // <<< AÑADIR APERTURA PHP
                                // Inicialmente vacío, se llenará con JS después de AJAX
                                echo '<p id="loadingPermissions" class="text-center col-12"><i class="fas fa-spinner fa-spin"></i> Cargando permisos...</p>';
                                echo '<div id="menuPermissionsStructure" style="display: none;">';
                                // La estructura se generará aquí con JS
                                echo '</div>';
                                echo '<hr><h5 class="mt-3">Permisos Adicionales (No en Menú Principal)</h5>';
                                echo '<div id="additionalPermissions" class="row"></div>'; // Para permisos no mapeados                                
                                ?>
                            </div>
                        </div>
                        <div class="card-footer text-center">
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-save mr-1"></i> Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            </div>

<?php include_once "footer.php"; ?>

<script>
console.log("Script block started"); // <<< NUEVO LOG 1
let allPermissionsData = {}; // Mapa: nombrePermiso -> { idPermiso, descripcionPermiso }
let profilePermissions = []; // Array de idPermiso asignados al perfil

$(document).ready(function() {
    console.log("Document ready!"); // <<< NUEVO LOG 2
    console.log("Attaching change handler to #selectPerfil"); // <<< NUEVO LOG 3
    $('#selectPerfil').on('change', function() {
        // *** RESTAURAR CÓDIGO ORIGINAL DEL HANDLER ***
        console.log("Change event detected on #selectPerfil!"); // Log para confirmar

        const idPerfil = $(this).val();
        const nombrePerfil = $(this).find('option:selected').text(); // <<< AÑADIR ESTA LÍNEA

        if (idPerfil) {
            $('#nombrePerfilSeleccionado').text(nombrePerfil);
            $('#hiddenIdPerfil').val(idPerfil);
            // Mostrar indicador de carga y ocultar estructuras
            $('#loadingPermissions').show();
            $('#menuPermissionsStructure').hide().empty(); // Limpiar estructura anterior
            $('#additionalPermissions').hide().empty(); // Limpiar adicionales
            $('#permisosContainer').show();
            // Resetear el botón de "Seleccionar Todo"
            $('#toggleAllPermissionsBtn').text('Seleccionar Todo').data('action', 'select');



            // Cargar permisos vía AJAX
            $.ajax({ // <<< Asegúrate que la llamada $.ajax() esté completa
                url: 'obtenerPermisosPerfil.php', // <<< RESTAURAR URL
                type: 'GET',                   // <<< RESTAURAR TYPE
                data: { idPerfil: idPerfil },
                dataType: 'json',
                beforeSend: function() { console.log("Iniciando AJAX para idPerfil:", idPerfil); }, // Log antes de enviar
                success: function(response) {
                    console.log("Respuesta AJAX recibida:", response); // Log de la respuesta completa

                    if (response && response.success) {
                        allPermissionsData = {};
                        // Asegurarse que response.permisosDelPerfil sea un array y los IDs sean enteros
                        let assignedPermissionIds = new Set(
                            Array.isArray(response.permisosDelPerfil) ? response.permisosDelPerfil.map(id => parseInt(id, 10)) : []
                        );
                        let permissionsInMenu = new Set(); // Para rastrear qué permisos ya se mostraron en el menú

                        // Mapear todos los permisos por nombre para fácil acceso
                        if (response.todosLosPermisos && Array.isArray(response.todosLosPermisos) && response.todosLosPermisos.length > 0) {
                            response.todosLosPermisos.forEach(permiso => {
                                // Asegurar que idPermiso sea un entero al construir el mapa
                                allPermissionsData[permiso.nombrePermiso] = {
                                    ...permiso,
                                    idPermiso: parseInt(permiso.idPermiso, 10)
                                };
                            });
                        }
                        console.log("Permisos mapeados (allPermissionsData):", allPermissionsData);
                        console.log("IDs de permisos asignados (assignedPermissionIds):", assignedPermissionIds);

                        // --- Generar HTML del Menú con Checkboxes ---
                        let menuHtml = '';
                        const menuStructureJs = <?php echo json_encode($menuStructure, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE); ?>; // Pasar estructura PHP a JS (más seguro)
                        console.log("Estructura del menú JS (menuStructureJs):", menuStructureJs); // Log de la estructura

                        function buildMenuHtml(items, level = 0) {
                            let html = '';
                            const indentStyle = `style="margin-left: ${level * 20}px;"`;
                            console.log(`[buildMenuHtml L${level}] Iniciando. Items:`, JSON.parse(JSON.stringify(items)));
                            for (const [text, details] of Object.entries(items)) {
                                if (details && details.permiso) {
                                    const permisoNombre = details.permiso;
                                    const permisoInfo = allPermissionsData[permisoNombre];
                                    if (permisoInfo) {
                                        const idPermiso = permisoInfo.idPermiso; // Ya es entero
                                        const descripcion = permisoInfo.descripcionPermiso || permisoNombre;
                                        const tienePermiso = assignedPermissionIds.has(idPermiso); // Comparación int con int
                                        console.log(`  [buildMenuHtml L${level}] Evaluando: ${text} (ID: ${idPermiso}). Perfil tiene este permiso? ${tienePermiso}.`);
                                        const isChecked = tienePermiso;
                                        html += `<div class="form-check" ${indentStyle}>`;
                                        html += `<input class="form-check-input permission-checkbox" type="checkbox" name="permisos[]" value="${idPermiso}" id="permiso_${idPermiso}" ${isChecked ? 'checked' : ''}>`;
                                        html += `<label class="form-check-label" for="permiso_${idPermiso}">${text} <small class="text-muted">(${descripcion})</small></label>`;
                                        html += `</div>`;
                                        permissionsInMenu.add(idPermiso);
                                    }
                                } else if (details && details.submenu) {
                                    console.log(`  [buildMenuHtml L${level}] Submenú encontrado: ${text}`);
                                    html += `<h5 ${indentStyle} class="mt-3 mb-1">${text}</h5>`;
                                    html += buildMenuHtml(details.submenu, level + 1);
                                }
                            }
                            console.log(`[buildMenuHtml L${level}] Finalizando. HTML parcial generado:`, html.substring(0, 200) + "...");
                            return html;
                        }

                        try {
                            menuHtml = buildMenuHtml(menuStructureJs);
                            console.log("HTML generado para el menú:", menuHtml);
                        } catch (e) {
                            console.error("Error durante buildMenuHtml:", e);
                            $('#loadingPermissions').text('Error al generar la lista de permisos.').addClass('text-danger');
                            return;
                        }

                        try {
                            $('#menuPermissionsStructure').html(menuHtml).show();
                        } catch (e) {
                            console.error("Error al actualizar #menuPermissionsStructure:", e);
                            $('#loadingPermissions').text('Error al mostrar la lista de permisos (1).').addClass('text-danger');
                            return;
                        }

                        let additionalHtml = '';
                        try {
                            if (response.todosLosPermisos && Array.isArray(response.todosLosPermisos)) {
                                response.todosLosPermisos.forEach(permiso => {
                                    const currentPermisoId = parseInt(permiso.idPermiso, 10); // Asegurar que es int
                                    if (!permissionsInMenu.has(currentPermisoId)) {
                                        const isChecked = assignedPermissionIds.has(currentPermisoId);
                                        additionalHtml += `<div class="col-md-4 col-sm-6 mb-2"><div class="form-check">`;
                                        additionalHtml += `<input class="form-check-input permission-checkbox" type="checkbox" name="permisos[]" value="${currentPermisoId}" id="permiso_${currentPermisoId}" ${isChecked ? 'checked' : ''}>`;
                                        additionalHtml += `<label class="form-check-label" for="permiso_${currentPermisoId}">${permiso.descripcionPermiso || permiso.nombrePermiso}</label>`;
                                        additionalHtml += `</div></div>`;
                                    }
                                });
                            }
                            console.log("HTML generado para permisos adicionales:", additionalHtml);
                        } catch (e) {
                            console.error("Error durante generación de permisos adicionales:", e);
                            $('#loadingPermissions').text('Error al generar permisos adicionales.').addClass('text-danger');
                            return;
                        }

                        try {
                            $('#additionalPermissions').html(additionalHtml || '<p class="col-12 text-muted">No hay permisos adicionales.</p>').show();
                        } catch (e) {
                            console.error("Error al actualizar #additionalPermissions:", e);
                            $('#loadingPermissions').text('Error al mostrar la lista de permisos (2).').addClass('text-danger');
                            return;
                        }

                        try {
                            $('#loadingPermissions').hide();
                        } catch (e) {
                            console.error("Error al ocultar #loadingPermissions:", e);
                        }
                    } else {
                        // Si response.success es false o la respuesta no tiene la estructura esperada
                        let serverMessage = 'Error al procesar los permisos desde el servidor.';
                        if (response && response.message) {
                            serverMessage = response.message;
                        } else if (response && typeof response === 'object' && !response.success) {
                            console.warn("Respuesta del servidor indicó fallo (success:false) pero no proporcionó un mensaje detallado. Respuesta:", response);
                        } else {
                            console.error("Respuesta del servidor vacía, malformada o no indicó éxito. Respuesta:", response);
                        }
                        $('#loadingPermissions').text(serverMessage).addClass('text-danger');
                        $('#menuPermissionsStructure').hide().empty();
                        $('#additionalPermissions').hide().empty();
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Error al cargar permisos:", status, error, xhr.responseText);
                    // Mostrar el mensaje de error del servidor si está disponible, o uno genérico
                    let errorMessage = 'Error al cargar los permisos.';
                    if (xhr.responseText) {
                        try {
                            const serverResponse = JSON.parse(xhr.responseText);
                            if (serverResponse && serverResponse.message) {
                                errorMessage = serverResponse.message;
                            }
                        } catch (e) {
                            // Si xhr.responseText no es JSON, podría ser un error HTML de PHP
                            // En un entorno de desarrollo, podrías mostrar una parte de xhr.responseText
                            // pero para producción es mejor un mensaje genérico.
                            // console.warn("Respuesta del servidor no es JSON:", xhr.responseText);
                        }
                    }
                    $('#loadingPermissions').text(errorMessage).addClass('text-danger');
                    $('#menuPermissionsStructure').hide().empty();
                    $('#additionalPermissions').hide().empty();
                 }
             }); // Fin $.ajax
         } else {
            $('#permisosContainer').hide();
        }
    });

    // Manejo del botón "Seleccionar Todo / Deseleccionar Todo"
    $('#toggleAllPermissionsBtn').on('click', function() {
        const action = $(this).data('action');
        const checkboxes = $('#listaPermisos .permission-checkbox'); // Seleccionar solo checkboxes de permisos

        if (action === 'select') {
            checkboxes.prop('checked', true);
            $(this).text('Deseleccionar Todo').data('action', 'deselect');
        } else {
            checkboxes.prop('checked', false);
            $(this).text('Seleccionar Todo').data('action', 'select');
        }
    });

    // Guardar cambios vía AJAX
    $('#formPermisos').on('submit', function(e) {
        e.preventDefault();
        const formData = $(this).serialize();
        const submitButton = $(this).find('button[type="submit"]');
        const originalButtonHtml = submitButton.html();
        submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...');

        $.ajax({
            url: 'gestionarPermisosPerfil.do.php',
            type: 'POST',
            data: formData,
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    Swal.fire('¡Guardado!', response.message, 'success');
                } else {
                    Swal.fire('Error', response.message, 'error');
                }
            },
            error: function(xhr, status, error) {
                console.error("Error al guardar permisos:", status, error, xhr.responseText);
                Swal.fire('Error de Comunicación', 'No se pudo guardar los cambios.', 'error');
            },
            complete: function() {
                 submitButton.prop('disabled', false).html(originalButtonHtml);
            }
        });
    });
});
</script>

<style>
/* Opcional: Mejorar legibilidad de checkboxes */
.form-check-label {
    cursor: pointer;
}
</style>
