<?php
// Asegúrate de que la sesión esté iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// *** Incluir el archivo de helpers ANTES de usar las funciones ***
include_once "helpers.php";

// Verifica si el usuario está logueado y si existen todas las variables de sesión necesarias
// Esta verificación es crucial antes de intentar usar $_SESSION['nombre'] o los permisos
if (!isset($_SESSION['usuario']) || !isset($_SESSION['nombre']) || !isset($_SESSION['idPerfil'])) {
    // Redirigir al login o manejar el caso de usuario no autenticado
    header('Location: index.php');
    exit();
}
?>
<div class="wrapper">
  <!-- Preloader -->
  <!--div class="preloader flex-column justify-content-center align-items-center">
    <img class="animation__shake" src="sources/images/dom.png" alt="Logo DOM" height="60" width="60">
  </div-->

<!-- Navbar -->
  <nav class="main-header navbar navbar-expand navbar-white navbar-light">
    <!-- Left navbar links -->
    <ul class="navbar-nav">
      <li class="nav-item">
        <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
      </li>
      <li class="nav-item d-none d-sm-inline-block">
        <a href="default.php" class="nav-link" style="font-size:14px">Home</a>
      </li>
      <!--li class="nav-item d-none d-sm-inline-block">
        <a href="#" class="nav-link">Contact</a>
      </li-->
    </ul>

    <!-- Right navbar links -->
    <ul class="navbar-nav ml-auto">
      <li class="nav-item">
        <a class="nav-link" data-widget="fullscreen" href="#" role="button">
          <i class="fas fa-expand-arrows-alt"></i>
        </a>
      </li>      
    </ul>
  </nav>
  <!-- /.navbar -->

    <!-- Main Sidebar Container -->
    <aside class="main-sidebar sidebar-dark-primary elevation-4">
    <!-- Brand Logo -->
    <a href="default.php" class="brand-link">
      <img src="sources/images/dom.png" alt="DOM Logo" class="brand-image img-circle elevation-3" style="opacity: .8">
      <span class="brand-text font-weight-light" style="font-size:14px">Control de Inventarios</span>
    </a>

    <!-- Sidebar -->
    <div class="sidebar" >
      <!-- Sidebar user panel (optional) -->
      <div class="user-panel mt-3 pb-3 mb-3 d-flex">
        <div class="image">
          <img src="sources/images/user.png" class="img-circle elevation-2" alt="User Image">
        </div>
        <div class="info" style="font-size:14px">
          <a href="#" class="d-block">
              <?php echo isset($_SESSION['nombre']) ? htmlspecialchars($_SESSION['nombre']) : 'Usuario'; ?>
          </a>
      </div>
      </div> 

      <!-- Sidebar Menu Dinámico por Permisos -->
      <nav class="mt-2" style="font-size:11px">
      <nav class="mt-2" style="font-size:12px"> <!-- Ajustado tamaño de fuente para legibilidad -->
        <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">

        <!-- Dashboard (si todos lo ven o tiene permiso 'view_dashboard') -->
          <?php if (usuarioTienePermiso('view_dashboard')): ?>
          <li class="nav-item">
            <a href="default.php" class="nav-link">
            <a href="default.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'default.php' ? 'active' : ''; ?>">
              <i class="nav-icon fas fa-tachometer-alt"></i>
              <p>Dashboard</p>
            </a>
          </li>
          <?php endif; ?>

        <!-- Sección Buscar (si tiene al menos un permiso de búsqueda) -->
          <!-- Sección Buscar -->
            <?php if (
                usuarioTienePermiso('view_report_equipment') ||
                usuarioTienePermiso('view_report_materials') ||
                usuarioTienePermiso('view_report_tools') ||
                usuarioTienePermiso('view_report_ocas') ||
                usuarioTienePermiso('manage_projects') // O si puede gestionar proyectos

            ): ?>
          <li class="nav-item">
          <li class="nav-item <?php echo in_array(basename($_SERVER['PHP_SELF']), ['buscarEqProy.php', 'buscarHerraProy.php', 'buscarMaterProy.php', 'buscarAmpos.php', 'listaDeProyectos.php']) ? 'menu-open' : ''; ?>">
            <a href="#" class="nav-link">
              <i class="nav-icon bi bi-binoculars"></i><p>Buscar<i class="fas fa-angle-left right"></i></p>
            </a>
            <ul class="nav nav-treeview">

              <?php if (usuarioTienePermiso('manage_projects')): ?>
              
              <li class="nav-item"><a href="listaDeProyectos.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'listaDeProyectos.php' ? 'active' : ''; ?>"><i class="bi bi-search nav-icon"></i><p>Proyectos</p></a></li>
              <?php endif; ?>
            </ul>
          </li>
          <?php endif; ?>

        <!-- Sección Ingresos (si tiene permiso para ingresar algo) -->
          <!-- Sección Ingresos -->
          <?php if (
              usuarioTienePermiso('manage_equipment') || // Asumiendo un permiso general o específico
              usuarioTienePermiso('manage_tools') ||
              usuarioTienePermiso('manage_materials') ||
              usuarioTienePermiso('manage_ocas') ||// Asumiendo permiso para OCAs
              usuarioTienePermiso('manage_ocas_by_project')
          ): ?>
          <li class="nav-item">

          <?php endif; ?>         
            
        <!-- Sección Excel -->
          <?php if (
              // Condición original: usuarioTienePermiso('upload_excel_ocas')
              // Si no quedan más items en esta sección después de quitar 'upload_excel_ocas',
              // esta condición podría necesitar ajustarse o eliminarse si la sección ya no es necesaria.
              // Por ahora, la mantenemos comentada para ilustrar.
              false // Temporalmente false para ocultar la sección si solo contenía "Cargar Excel Ocas"
          ): ?>
          <li class="nav-item <?php echo in_array(basename($_SERVER['PHP_SELF']), ['cargarExcelEq.php', 'cargarExcelHe.php', 'cargarExcelMa.php', 'cargarExcelOcas.php']) ? 'menu-open' : ''; ?>">
            <ul class="nav nav-treeview">
              <!-- El item 'Cargar Excel Ocas' ha sido removido -->
            </ul>
          </li>
          <?php endif; ?>

        <!-- Sección Ordenes de Compra -->
          <?php if (
              usuarioTienePermiso('manage_oca_payments') ||
              usuarioTienePermiso('create_oca') ||
              usuarioTienePermiso('view_ocas')
          ): ?>
          <li class="nav-item <?php echo in_array(basename($_SERVER['PHP_SELF']), ['pagosOca.php', 'ingresarOca.php', 'cargarExcelOcas.php', 'listarOcas.php']) ? 'menu-open' : ''; ?>">
            <a href="#" class="nav-link">
              <i class="nav-icon bi bi-bag"></i><p>Ordenes de Compra<i class="right fas fa-angle-left"></i></p>
            </a>
            <ul class="nav nav-treeview">
            <?php if (usuarioTienePermiso('create_oca')): ?>
              <li class="nav-item"><a href="ingresarOca.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'ingresarOca.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Registrar OCA</p></a></li>
              <?php endif; ?>
              
              <?php if (usuarioTienePermiso('manage_oca_payments')): ?>
              <li class="nav-item"><a href="pagosOca.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'pagosOca.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Pagos OCA</p></a></li>
              <?php endif; ?>
              <?php if (usuarioTienePermiso('view_ocas')): ?>
              <li class="nav-item"><a href="listarOcas.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'listarOcas.php' ? 'active' : ''; ?>"><i class="bi bi-search nav-icon"></i><p>Listar OCAS</p></a></li>
              <?php endif; ?>
              <?php if (usuarioTienePermiso('view_print_batches')): // Permiso para ver lotes de impresión ?>
              <li class="nav-item">
                <a href="listarLotes.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'listarLotes.php' ? 'active' : ''; ?>">
                  <i class="fas fa-layer-group nav-icon"></i><p>Lotes de Impresión</p></a>
              </li>
              <?php endif; ?>
            </ul>
          </li>
          <?php endif; ?>

        <!-- Sección Reportes y Gráficas -->
          <?php if (
              usuarioTienePermiso('generate_reports') ||
              usuarioTienePermiso('view_charts') ||
              usuarioTienePermiso('generate_excel_reports')
          ): ?>
          <li class="nav-item <?php echo in_array(basename($_SERVER['PHP_SELF']), ['generarReportes.php', 'generarGraficos.php', 'crearExcel.php']) ? 'menu-open' : ''; ?>">
            <a href="#" class="nav-link">
              <i class="nav-icon fa-solid fa-chart-pie"></i><p>Reportes y Gráficas<i class="right fas fa-angle-left"></i></p>
            </a>
            <ul class="nav nav-treeview">
              <?php if (usuarioTienePermiso('generate_reports')): ?>
              <li class="nav-item"><a href="generarReportes.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'generarReportes.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Generar Reportes</p></a></li>
              <?php endif; ?>
              
            </ul>
          </li>
          <?php endif; ?>
          
        <!-- Sección Administración -->
            <?php
                // --- DEBUG: Mostrar permisos en sesión ---
                      //echo "<pre>Permisos en Sesión: "; print_r($_SESSION['permisosUsuario']); echo "</pre>";

                // --- FIN DEBUG ---
            ?>
           <?php if (
               usuarioTienePermiso('manage_exclusions') ||
               usuarioTienePermiso('manage_states') ||
               usuarioTienePermiso('manage_suppliers') ||
               usuarioTienePermiso('manage_residents') ||
               usuarioTienePermiso('manage_storekeepers') ||
               usuarioTienePermiso('manage_users') ||
               usuarioTienePermiso('manage_profiles')
           ): ?>
           <li class="nav-item <?php echo in_array(basename($_SERVER['PHP_SELF']), ['archivosExcluidos.php', 'registrarEstados.php', 'registrarProveedor.php', 'listarResidentes.php', 'listarBodegueros.php', 'registrarUsuario.php', 'gestionarPerfiles.php', 'gestionarPermisosPerfil.php']) ? 'menu-open' : ''; ?>">
             <a href="#" class="nav-link">
               <i class="nav-icon bi bi-shield-check"></i><p>Administración<i class="right fas fa-angle-left"></i></p>
             </a>
             <ul class="nav nav-treeview">
                
                <?php if (usuarioTienePermiso('manage_states')): ?>
                <li class="nav-item"><a href="registrarEstados.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'registrarEstados.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Registro de Estados</p></a></li>
                <?php endif; ?>
                <?php if (usuarioTienePermiso('manage_suppliers')): ?>
                <li class="nav-item"><a href="registrarProveedor.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'registrarProveedor.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Registro Proveedores</p></a></li>
                <?php endif; ?>
                <?php if (usuarioTienePermiso('manage_residents')): ?>
                <li class="nav-item"><a href="listarResidentes.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'listarResidentes.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Residentes</p></a></li>
                <?php endif; ?>
                <?php if (usuarioTienePermiso('manage_storekeepers')): ?>
                <li class="nav-item"><a href="listarBodegueros.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'listarBodegueros.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Bodegueros</p></a></li>
                <?php endif; ?>
                <?php if (usuarioTienePermiso('manage_profiles')): ?>
                <li class="nav-item"><a href="gestionarPerfiles.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'gestionarPerfiles.php' ? 'active' : ''; ?>"><i class="far fa-id-card nav-icon"></i><p>Gestionar Perfiles</p></a></li>
                <!-- Enlace a la nueva gestión de permisos globales -->
                <li class="nav-item"><a href="gestionarPermisos.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'gestionarPermisos.php' ? 'active' : ''; ?>"><i class="fas fa-key nav-icon"></i><p>Gestionar Permisos Sistema</p></a></li>
                <li class="nav-item"><a href="gestionarPermisosPerfil.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'gestionarPermisosPerfil.php' ? 'active' : ''; ?>"><i class="far fa-circle nav-icon"></i><p>Gestionar Permisos</p></a></li>
                <?php endif; ?>
                <?php if (usuarioTienePermiso('manage_users')): ?>
                <li class="nav-item"><a href="listarUsuarios.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'listarUsuarios.php' || basename($_SERVER['PHP_SELF']) == 'registrarUsuario.php' ? 'active' : ''; ?>"><i class="fas fa-users nav-icon"></i><p>Gestionar Usuarios</p></a></li>
                <?php endif; ?>
                
                
                
             </ul>
           </li>
          <?php endif; ?>
           
           

          <!-- Configuración (Cambio de pass y Salir siempre visibles para usuarios logueados) -->

          <li class="nav-item <?php echo in_array(basename($_SERVER['PHP_SELF']), ['cambiarPassword.php', 'logout.php']) ? 'menu-open' : ''; ?>">
            <a href="#" class="nav-link">
            <i class="bi bi-gear nav-icon"></i><p>Configuración<i class="right fas fa-angle-left"></i></p>
            </a>
            <ul class="nav nav-treeview">
              
              <?php // El permiso 'change_own_password' podría usarse aquí si fuera necesario ?>
              <li class="nav-item"><a href="cambiarPassword.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) == 'cambiarPassword.php' ? 'active' : ''; ?>"><i class="bi bi-person-gear nav-icon"></i><p>Cambio de Password</p></a></li>
              <?php // El permiso 'logout' podría usarse aquí si fuera necesario ?>
              <li class="nav-item"><a href="logout.php" class="nav-link"><i class="bi bi-box-arrow-right nav-icon"></i><p>Salir</p></a></li>
            </ul>
          </li>

        </ul>
      </nav>
      <!-- /.sidebar-menu -->

      <!-- /.sidebar-menu -->
    </div>
    <!-- /.sidebar -->
  </aside>