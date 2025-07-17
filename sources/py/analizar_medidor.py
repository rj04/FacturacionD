# c:\UniServerZ\www\inventario-test\analizar_medidor.py
import sys
# Redirigir estas impresiones de depuración a stderr
#print(f"DEBUG: Python Executable: {sys.executable}", file=sys.stderr)
#print(f"DEBUG: Python Version: {sys.version}", file=sys.stderr)
#print(f"DEBUG: sys.path: {sys.path}", file=sys.stderr)

import cv2
import numpy as np
import json
import math # Para atan2
import mysql.connector # Para la conexión a la BD

def preprocess_image(image_path):
    try:
        img_bgr = cv2.imread(image_path) # Cargar en color
        if img_bgr is None:
            return None, None
        img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        img_blurred_gray = cv2.GaussianBlur(img_gray, (5, 5), 0)
        return img_bgr, img_blurred_gray # Devolver ambas
    except Exception:
        return None, None

def get_calibration_data(machine_identifier):
    """Obtiene los datos de calibración de la base de datos para una máquina específica."""
    try:
        # --- CONFIGURACIÓN DE LA BASE DE DATOS ---
        # ¡IMPORTANTE! Mueve estas credenciales a un archivo de configuración seguro o variables de entorno.
        # No las dejes hardcodeadas en producción.
        db_config = {
            'host': 'localhost',      # O la IP de tu servidor de BD
            'user': 'admin',  # Reemplaza con tu usuario de BD
            'password': 'Domsv2025/*++', # Reemplaza con tu contraseña
            'database': 'inventario-test' # Reemplaza con el nombre de tu BD
        }
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True) # dictionary=True para obtener resultados como diccionarios
        
        query = "SELECT angulo_vacio, valor_combustible_vacio, angulo_lleno, valor_combustible_lleno FROM maquinaria_calibraciones WHERE identificador_maquina = %s"
        cursor.execute(query, (machine_identifier,))
        calibration = cursor.fetchone()
        return calibration # Devuelve un diccionario o None si no se encuentra
    except mysql.connector.Error as err:
        print(f"ERROR DB: {err}", file=sys.stderr)
        return None
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def detect_needle_and_get_angle(img_bgr_input):
    """
        Procesa la imagen para detectar la aguja y calcular su ángulo desde el pivote.
    Devuelve el ángulo en grados (calculado con atan2) o None si la detección falla.

    """
    try:
        if img_bgr_input is None:
          #  print("DEBUG detect_needle_and_get_angle: img_bgr_input es None.", file=sys.stderr)
            return None

        # Convertir la imagen a HSV
        hsv_image = cv2.cvtColor(img_bgr_input, cv2.COLOR_BGR2HSV)

        # 1. Definir el rango del color naranja en HSV
        # Estos valores son EJEMPLOS y necesitarás AJUSTARLOS para tus imágenes.
        # H (Tonalidad): Naranja está alrededor de 5-20 en OpenCV (escala 0-179)
        # S (Saturación): Desde un valor medio hasta máximo (ej. 100-255)
        # V (Valor/Brillo): Desde un valor medio hasta máximo (ej. 100-255)
        #184,112,51
        lower_orange = np.array([5, 100, 100])
        upper_orange = np.array([30, 255, 255]) # Ampliamos un poco más el H para cubrir más tonos
        #print(f"DEBUG: Usando rango HSV naranja: Bajo={lower_orange}, Alto={upper_orange}", file=sys.stderr)

        # 2. Crear una máscara para el color naranja
        mask = cv2.inRange(hsv_image, lower_orange, upper_orange)
        # print(f"DEBUG: Píxeles blancos en la máscara inicial: {cv2.countNonZero(mask)}", file=sys.stderr)

        # 3. (Opcional) Aplicar operaciones morfológicas para limpiar la máscara
        kernel = np.ones((5,5),np.uint8)
        mask_cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel) # Elimina ruido pequeño
        mask_cleaned = cv2.morphologyEx(mask_cleaned, cv2.MORPH_CLOSE, kernel) # Rellena huecos pequeños
        # print(f"DEBUG: Píxeles blancos en la máscara limpiada: {cv2.countNonZero(mask_cleaned)}", file=sys.stderr)

        # 4. Encontrar contornos en la máscara
        contours, _ = cv2.findContours(mask_cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
       # print(f"DEBUG: Número de contornos encontrados: {len(contours)}", file=sys.stderr)

        if contours:
            # Asumir que el contorno más grande es la aguja
            needle_contour = max(contours, key=cv2.contourArea)

            # --- NUEVO MÉTODO: Calcular ángulo desde el pivote ---
            # **Paso 1: Definir el pivote del medidor (centro)**
            # ¡¡¡IMPORTANTE!!! DEBES AJUSTAR ESTAS COORDENADAS (pivot_x, pivot_y)
            # PARA QUE COINCIDAN CON EL CENTRO DEL MEDIDOR EN TUS IMÁGENES.
            # Estas coordenadas son relativas a la imagen completa.
            # Puedes obtenerlas usando un editor de imágenes para ver las coordenadas del píxel.
            image_height, image_width = img_bgr_input.shape[:2]
            pivot_x = image_width // 2  # Ejemplo: centro horizontal de la imagen
            pivot_y = image_height // 2 # Ejemplo: centro vertical de la imagen
            #pivot_x = 32  # Asegúrate de que sean enteros y correctos para tus imágenes
            #pivot_y = 153 # Asegúrate de que sean enteros y correctos para tus imágenes

            # Si el medidor no está centrado, reemplaza las líneas de arriba con:
            # pivot_x = TU_COORDENADA_X_DEL_PIVOTE
            # pivot_y = TU_COORDENADA_Y_DEL_PIVOTE
           #print(f"DEBUG: Pivote del medidor usado: ({pivot_x}, {pivot_y})", file=sys.stderr)

            # Calcular el rectángulo de área mínima (minAreaRect) para obtener su ángulo como referencia o depuración
            rect = cv2.minAreaRect(needle_contour) # <--- LÍNEA AÑADIDA
            # El ángulo devuelto por minAreaRect puede ser un poco complicado de interpretar directamente
            # para el nivel del medidor. Puede estar en el rango [-90, 0).
            # Si el ancho es menor que el alto, el ángulo es la orientación principal.
            (center_x_rect, center_y_rect), (width_rect, height_rect), angle_min_area_rect = rect # Usar nombres de variable distintos para claridad
            #print(f"DEBUG: Rectángulo de aguja (minAreaRect): centro=({center_x_rect:.2f},{center_y_rect:.2f}), dim=({width_rect:.2f},{height_rect:.2f}), angulo={angle_min_area_rect:.2f}", file=sys.stderr)

            # **Paso 2: Encontrar el punto del contorno de la aguja más alejado del pivote**
            # Esto asumirá que el extremo de la aguja es el punto más distante.
            farthest_point = None
            max_dist_sq = -1

            for point_outer_array in needle_contour:
                point = point_outer_array[0] # El contorno es una lista de arrays de un solo punto
                dist_sq = (point[0] - pivot_x)**2 + (point[1] - pivot_y)**2
                if dist_sq > max_dist_sq:
                    max_dist_sq = dist_sq
                    farthest_point = point
            
            if farthest_point is None:
                #print("DEBUG: No se pudo determinar el punto extremo de la aguja.", file=sys.stderr)
                return None
            
            #print(f"DEBUG: Punto extremo de la aguja detectado: ({farthest_point[0]}, {farthest_point[1]})", file=sys.stderr)

            # **Paso 3: Calcular el ángulo usando math.atan2**
            angle_rad = math.atan2(farthest_point[1] - pivot_y, farthest_point[0] - pivot_x)
            angle_deg = math.degrees(angle_rad)
            #print(f"DEBUG: Ángulo calculado desde pivote (atan2): {angle_deg:.2f} grados", file=sys.stderr)

            # Necesitarás una lógica más sofisticada aquí para:
            #  a. Identificar el pivote de la aguja (podría ser el centro del medidor, no necesariamente el centro del rectángulo de la aguja).
            #  b. Calcular el ángulo desde el pivote hasta el extremo de la aguja.
            #  c. Calibrar: tomar varias imágenes de referencia (vacío, 1/4, 1/2, 3/4, lleno) y anotar el ángulo que
            #     tu sistema calcula para cada una. Luego usar np.interp() con esos puntos de calibración.
            # --- INICIO: LÓGICA DE EJEMPLO PARA INTERPOLAR (MOVIDA A OTRA FUNCIÓN) ---
            # El ángulo de minAreaRect está entre -90 y 0 si width < height.
            # Vamos a mapearlo a un rango de 0-100 para simular.
            # Si el ángulo es -90 (vertical hacia arriba), podría ser 0. Si es 0 (horizontal), podría ser 50.
            # Esto es muy especulativo y necesita calibración real.            
            # AHORA USAREMOS angle_deg (el calculado con atan2) para la interpolación
        return angle_deg # Devolver el ángulo calculado
            # --- FIN: LÓGICA DE EJEMPLO ---

        #print("DEBUG detect_needle_and_get_angle: No se encontraron contornos válidos para la aguja.", file=sys.stderr)
        return None

    except Exception as e:
        #print(f"ERROR en detect_needle_and_get_angle: {e}", file=sys.stderr)
        return None

def interpolate_fuel_level(angle_to_interpolate, calibration_data):
    """Interpola el nivel de combustible basado en el ángulo y los datos de calibración."""
    if angle_to_interpolate is None or calibration_data is None:
        return None
    try:
            #  a. Identificar el pivote de la aguja (podría ser el centro del medidor, no necesariamente el centro del rectángulo de la aguja).
            #  b. Calcular el ángulo desde el pivote hasta el extremo de la aguja.
            #  c. Calibrar: tomar varias imágenes de referencia (vacío, 1/4, 1/2, 3/4, lleno) y anotar el ángulo que
            # --- LÓGICA DE INTERPOLACIÓN USANDO DATOS DE CALIBRACIÓN DE LA BD ---

            angle_db_empty = calibration_data['angulo_vacio']
            fuel_db_empty = calibration_data['valor_combustible_vacio']
            angle_db_full = calibration_data['angulo_lleno']
            fuel_db_full = calibration_data['valor_combustible_lleno']

            # np.interp(x, xp, fp)
            # xp (puntos de datos de entrada - nuestros ángulos) deben estar en orden ascendente.
            # fp (puntos de datos de salida - nuestros valores de combustible) deben corresponder a xp.

            # Ordenamos los puntos de referencia por ángulo para np.interp
            if angle_db_empty < angle_db_full: # Caso común: ángulo vacío < ángulo lleno
                xp_angles = [angle_db_empty, angle_db_full]
                fp_fuel_values = [fuel_db_empty, fuel_db_full]
            else:
                xp_angles = [angle_db_full, angle_db_empty] # Ángulo lleno < ángulo vacío
                fp_fuel_values = [fuel_db_full, fuel_db_empty]
            
            # Calcular el valor interpolado después de definir xp_angles y fp_fuel_values
            calibrated_fuel_value = np.interp(angle_to_interpolate, xp_angles, fp_fuel_values)
            
            # Asegurar que el valor esté dentro de los límites de tu calibración actual
            min_calibrated_fuel = min(fp_fuel_values)
            max_calibrated_fuel = max(fp_fuel_values)
            calibrated_fuel_value = max(min_calibrated_fuel, min(calibrated_fuel_value, max_calibrated_fuel))
            return round(calibrated_fuel_value, 2)
    except Exception as e:
        #print(f"ERROR en interpolate_fuel_level: {e}", file=sys.stderr)
        return None


def main(image_path, machine_identifier):
    # preprocess_image ahora devuelve una tupla (img_bgr, img_blurred_gray)
    img_bgr, img_gray_blurred = preprocess_image(image_path)

    if img_bgr is None: # Verificar si la carga de la imagen BGR falló
        #print("DEBUG main: preprocess_image devolvió None para img_bgr.", file=sys.stderr)
        return {"error": "No se pudo cargar o preprocesar la imagen.", "level": None}

    # 1. Intentar detectar el ángulo de la aguja
    detected_angle = detect_needle_and_get_angle(img_bgr)

    if detected_angle is None:
        #print(f"DEBUG main: No se pudo detectar el ángulo de la aguja para la imagen.", file=sys.stderr)
        return {"error": "No se pudo detectar la aguja en la imagen.", "level": None, "angle_detected": None}

    #print(f"DEBUG main: Ángulo detectado por detect_needle_and_get_angle: {detected_angle:.2f}", file=sys.stderr)

    # 2. Obtener datos de calibración
    calibration_data = get_calibration_data(machine_identifier)

    if calibration_data is None:
        #print(f"DEBUG main: No se encontraron datos de calibración para la máquina '{machine_identifier}'.", file=sys.stderr)
        return {"error": f"Calibración no encontrada para '{machine_identifier}'. Use el ángulo detectado para calibrar.", 
                "level": None, 
                "angle_detected": round(detected_angle, 2)}

    #print(f"DEBUG main: Datos de calibración para '{machine_identifier}': Vacio(Ang={calibration_data['angulo_vacio']},Val={calibration_data['valor_combustible_vacio']}), Lleno(Ang={calibration_data['angulo_lleno']},Val={calibration_data['valor_combustible_lleno']})", file=sys.stderr)

    # 3. Interpolar el nivel de combustible
    fuel_level = interpolate_fuel_level(detected_angle, calibration_data)
    #print(f"DEBUG main: fuel_level devuelto por interpolate_fuel_level: {fuel_level}", file=sys.stderr)

    if fuel_level is not None:
        return {"level": fuel_level, "error": None}
    else:
        # Si fuel_level es None, significa que la interpolación falló o no se pudo hacer.
        # El error de "calibración no encontrada" ya se maneja antes.
        error_msg = "No se pudo determinar el nivel de combustible desde la imagen."
        return {"level": None, "error": error_msg, "angle_detected": round(detected_angle, 2) if detected_angle is not None else None}

if __name__ == "__main__":
    #print("DEBUG Python: Script __main__ block started.", file=sys.stderr) # <--- NUEVA LÍNEA DE DEBUG
    output = {} 
    try: # Moví el try para englobar la comprobación de argumentos también
        if len(sys.argv) > 1:
            image_file_path = sys.argv[1]
            machine_id_arg = sys.argv[2] if len(sys.argv) > 2 else None
            #print(f"DEBUG Python: Image path: {image_file_path}, Machine ID: {machine_id_arg}", file=sys.stderr)

            if not image_file_path or not machine_id_arg:
                 output = {"error": "La ruta de la imagen proporcionada está vacía.", "level": None}
                 #print("DEBUG Python: Faltan argumentos: ruta de imagen o ID de máquina.", file=sys.stderr)
            else:
                 output = main(image_file_path, machine_id_arg)
        else:
            #print("DEBUG Python: No se proporcionaron suficientes argumentos (ruta de imagen, ID de máquina).", file=sys.stderr)
            output = {"error": "No se proporcionaron suficientes argumentos (ruta de imagen, ID de máquina).", "level": None}
    except Exception as e:
        #print(f"DEBUG Python: Unhandled exception in __main__: {str(e)}", file=sys.stderr) # <--- DEBUG EXISTENTE
        output = {"error": f"Error interno crítico en el script de Python: {str(e)}", "level": None}
    finally:
        # Este bloque finally asegura que siempre se intente imprimir un JSON
        #print(f"DEBUG Python: Final JSON output to stdout: {json.dumps(output)}", file=sys.stderr) # <--- DEBUG EXISTENTE
        print(json.dumps(output))
    # El bloque try-except-finally que tenías antes era bueno para asegurar una salida JSON
    # try:
    #     ... (lógica de arriba) ...
    # except Exception as e:
    #     output = {"error": f"Error interno crítico en el script de Python: {str(e)}", "level": None}
    # finally:
    #     print(json.dumps(output))
