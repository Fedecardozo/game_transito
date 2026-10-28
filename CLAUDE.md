# Teórico de Manejo — notas para Claude

Juego web de opción múltiple para estudiar el **examen teórico de la licencia de conducir de auto** (Lomas de Zamora, Argentina). HTML + CSS + JS puro, sin frameworks, sin build ni dependencias (solo las fuentes Bungee y Barlow desde Google Fonts). Repo: https://github.com/Fedecardozo/game_transito (rama única `main`).

El usuario escribe en español rioplatense: responder y escribir textos de la app, commits y README en ese idioma (voseo: "tocá", "elegí").

## Estructura

```
index.html          solo estructura: menú (#menu), partida (#quiz), resultado (#fin); sin <style>, sin JS inline, sin style="..."
css/estilos.css     todos los estilos; tema oscuro "ruta nocturna", tokens en :root, mobile-first (max-width 520px)
js/app.js           lógica: modos, armado de preguntas, puntos/combo/vidas, pausa, resultado, XP/niveles
js/audio.js         objeto global `Sonido`: música y efectos generados con Web Audio (no hay archivos de audio)
js/senales.js       const SENALES = [{ img, name, cat }]  (170 señales)
js/preguntas.js     const PREGUNTAS = [{ tema, q, o: [correcta, ...3 incorrectas] }]  (48 preguntas)
img/senales/        PNG de cada señal, nombre = slug del name
docs/capturas/      capturas usadas en el README
favicon.svg, apple-touch-icon.png   ícono "Ceda el paso"
.claude/launch.json servidor local: python -m http.server 8765
```

Los scripts se cargan en orden: senales.js → preguntas.js → audio.js → app.js (variables globales, sin módulos, para que funcione abriendo index.html con doble clic vía file://).

## Convenciones importantes

- En `PREGUNTAS`, **la primera opción es siempre la correcta**; el juego las mezcla al mostrar. Cada pregunta debe tener 4 opciones distintas.
- Las opciones incorrectas de las señales se arman solas: primero de la misma `cat`, después de otras.
- Ids estables de pregunta: `"s:" + img` para señales y `"t:" + q` para teoría. Si se cambia el texto de una pregunta o el nombre de un archivo de imagen, se pierde el progreso guardado de esa pregunta (no rompe nada: los ids desconocidos se ignoran).
- `localStorage` (siempre envuelto en try/catch): `teorico-errores` (ids errados), `teorico-perfil` (xp, mejor, mejorTotal, dominadas), `teorico-sonido` (musica, efectos).
- Reglas de juego en app.js: 50 pts por acierto + 10 por combo (máx +50); XP = puntos/5; nivel cada 500 XP; examen simulado ("mixto") con 3 vidas; aprobado ≥ 70% (criterio del juego, no oficial); estrellas 60/80/95%; avance automático 900 ms al acertar y 2200 ms al errar; con más de 30 preguntas la fila de casillas pasa a barra.
- Audio: los navegadores bloquean el sonido hasta el primer toque; la música arranca al cargar si se puede y si no con el primer gesto. Se corta y se pausa la partida al ocultar la página (visibilitychange/pagehide).

## Decisiones de contenido (pedidas por el usuario)

- Fuentes: "Sistema de Señalización Vial Uniforme", "Manual de Tránsito (versión reducida)" y el folleto de licencias del Municipio de Lomas de Zamora. Los PDFs ya no están en la carpeta; todo el contenido quedó en js/ e img/.
- **Fuera:** secciones de categorías profesionales (C, E, D) y **preguntas específicas de motos** (es para licencia de auto). Las **señales** de motos se mantienen.
- Respuestas correctas textuales del material; las incorrectas fueron inventadas para el juego.

## Git

- Commitear y pushear **solo cuando el usuario lo pide** (suele pedirlo explícitamente: "subilo a git").
- Mensajes de commit en español, con título corto y viñetas.
- Antes de commitear: verificar sintaxis (`node -e "new Function(...)"` sobre cada .js) y que todas las preguntas tengan 4 opciones distintas.

## Verificación visual

Para capturas a ancho de celular: Edge headless tiene ancho mínimo de ventana (~496px), así que conviene cargar index.html dentro de un `<iframe>` de 390px con `--allow-file-access-from-files` y manejar el juego desde el padre con `iframe.contentWindow.eval(...)` (las `let`/funciones de app.js son globales del iframe). Las herramientas que se usaron para recortar señales y sacar capturas no están en el repo.

## Pendiente / ideas

- En el examen simulado, al perder la última vida todavía se puede tocar otra respuesta antes de que salga el resultado (no se corrigió).
- Para jugar en el celular falta publicarlo (por ejemplo, GitHub Pages); se ofreció y el usuario no lo pidió todavía.
