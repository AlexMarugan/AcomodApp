# Planificador de rondas

Aplicación web progresiva (PWA) de uso personal. Los datos se guardan en el navegador mediante `localStorage`.

## Uso rápido

1. Sirve esta carpeta desde una dirección `https://` o `http://`.
2. Abre `index.html` desde el enlace en el móvil.
3. Usa “Añadir a pantalla de inicio” o el botón “Instalar”.
4. Genera una propuesta y revisa las asignaciones.
5. Pulsa “Guardar en histórico” cuando el plan quede confirmado.
6. Usa “Exportar copia” periódicamente para mover o conservar los datos.

## OneDrive

OneDrive sirve para conservar la carpeta y las copias JSON/PDF, pero su vista previa no siempre ofrece el contexto necesario para instalar una PWA ni para activar el modo offline. Para usarla de forma fiable en el móvil, publica esta misma carpeta en cualquier alojamiento web estático y conserva las copias de datos en OneDrive.

## Funciones incluidas

- Propuesta de cinco semanas con reuniones de miércoles y domingo.
- Dos personas de acomodación y dos personas de micros por reunión.
- Edición manual de cada asignación desde la propia planificación.
- La acomodación del domingo se comparte con la reunión de entre semana de esa semana.
- La persona de MULT del domingo se comparte con la reunión de entre semana de esa semana.
- La rotación considera el histórico y las asignaciones ya realizadas durante la nueva propuesta.
- Tras una asignación de micros, la persona queda fuera de nuevas asignaciones durante los dos días siguientes cuando la fecha lo permite.
- Las disponibilidades limitadas se emparejan entre miércoles y domingo y la pareja se repite la semana siguiente.
- Rotación por menor número de asignaciones históricas.
- Filtros de capacidad, disponibilidad y día permitido.
- Categorías de acomodación, micros, MULT y SON.
- Edición y alta/baja de personas.
- Histórico local.
- Impresión o guardado como PDF desde el navegador.
- Exportación e importación de copias JSON.
- Caché offline mediante service worker.
- Icono personalizado para la cabecera, favicon y pantalla de inicio.
