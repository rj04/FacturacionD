<?php
session_start();
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="sources/images/dom.png">
    <link rel="stylesheet" href="sources/css/login.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
    <title>Inventario Proyectos DOM</title>
</head>
<body>
    <section class="ftco-section">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-7 col-lg-5">
                    <div class="login-wrap p-4 p-md-5">
                        <div class="icon d-flex align-items-center justify-content-center">
                            <span class="fa fa-user-o"></span>
                        </div>
                        <h3 class="text-center mb-4">Ingreso al sistema</h3>
                        <!-- Código PHP para mostrar errores -->
                        <?php
                        if (isset($_SESSION['error'])) {
                            echo "<div class='alert alert-danger' role='alert'>" . $_SESSION['error'] . "</div>";
                            unset($_SESSION['error']); // Limpiar el error después de mostrarlo
                        }
                        ?>
                        <form action="login.php" class="login-form" method="post">
                            <div class="form-group">
                                <input type="text" class="form-control rounded-left" placeholder="Usuario" name="usuario" required>
                            </div>
                            <div class="form-group d-flex">
                                <input type="password" class="form-control rounded-left" placeholder="Password" name="password" required>
                            </div>
                            <div class="form-group">
                                <button type="submit" class="form-control btn btn-primary rounded submit px-3">Ingresar</button>
                            </div>
                            <div class="form-group d-md-flex">
                                <!-- Se pueden añadir funcionalidades adicionales aquí en el futuro -->
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </section>
</body>
</html>