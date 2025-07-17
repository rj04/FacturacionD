</main>
<footer class="main-footer" style="font-size:14px">
    <strong>Copyright &copy; <?php echo date('Y'); ?> <a href="">Control de Pagos &nbsp; DPA &nbsp; |&nbsp; Dirección Nacional de Obras Municipales</a>.</strong>
    All rights reserved.
    <div class="float-right d-none d-sm-inline-block">
      <b>Version</b> 0.0.1
    </div>
</footer>

<!-- Control Sidebar -->
<aside class="control-sidebar control-sidebar-dark">
    <!-- Control sidebar content goes here -->
</aside>
<!-- ./wrapper -->

<!-- Scripts en orden correcto -->

<!-- 1. jQuery (Versión COMPLETA, NO SLIM) -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- 2. Popper.js v1 (para Bootstrap 4) -->
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>

<!-- 3. Bootstrap 4 JS (Coincide con tu CSS) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.min.js" integrity="sha384-+sLIOodYLS7CIrQpBjl+C7nPvqq+FbNUBDunl/OZv93DB7Ln/533i8e/mZXLi/P+" crossorigin="anonymous"></script>

<!-- 4. Moment.js (si lo necesitas para daterangepicker u otros) -->
<script src="https://cdn.jsdelivr.net/momentjs/latest/moment.min.js"></script>
<script src="https://cdn.jsdelivr.net/momentjs/latest/locale/es.js"></script>

<!-- 5. DateRangePicker (si lo necesitas) -->
<script src="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js"></script>

<!-- 6. DataTables JS y su integración Bootstrap 4 -->
<script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap4.min.js"></script>

<!-- *** ASEGÚRATE QUE ESTAS LÍNEAS ESTÉN DESCOMENTADAS *** -->
<script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap4.min.js"></script>
<!-- *** FIN *** -->

<!-- 7. SweetAlert -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<!-- 8. jQuery UI (Requerido por AdminLTE bridge) -->
<script src="dashboard/plugins/jquery-ui/jquery-ui.min.js"></script>

<!-- 9. AdminLTE App -->
<script>
  // Resuelve conflicto entre jQuery UI tooltip y Bootstrap tooltip
  $.widget.bridge('uibutton', $.ui.button)
</script>
<script src="dashboard/dist/js/adminlte.js"></script>

<!-- Otros scripts específicos de tus páginas si los tienes -->

<!-- Modal Alineador de Imágenes -->
<div class="modal fade" id="alignerModal" tabindex="-1" aria-labelledby="alignerModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl"> <!-- modal-xl para más espacio, puedes usar modal-lg o el tamaño por defecto -->
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="alignerModalLabel">Herramienta de Alineación de Imágenes</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body" style="padding: 0; height: 85vh;"> <!-- Ajustar padding y altura según necesidad -->
        <iframe src="about:blank" id="alignerIframe" style="width: 100%; height: 100%; border: none;" title="Alineador de Imágenes"></iframe>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
      </div>
    </div>
  </div>
</div>

<script>
// Carga el contenido del iframe cuando se muestra el modal
function loadAlignerIframe() {
    const iframe = document.getElementById('alignerIframe');
    if (iframe.src === 'about:blank' || !iframe.src.includes('aligner_php_app/index.html')) {
        iframe.src = '<?php echo rtrim(dirname($_SERVER['PHP_SELF']), '/\\'); ?>/aligner_php_app/index.html';
    }
}

// Opcional: Limpia el iframe cuando el modal se cierra completamente para liberar recursos
$('#alignerModal').on('hidden.bs.modal', function () {
    document.getElementById('alignerIframe').src = 'about:blank';
});
</script>

</body>
</html>