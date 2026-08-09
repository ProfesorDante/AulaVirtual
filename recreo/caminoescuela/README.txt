CAMINO A LA ESCUELA — Nivel 1 Cleanup

Archivos para /recreo/caminoescuela/
- index.html
- style.css
- game.js

Cambios:
- Eliminados árboles procedurales que quedaban flotando.
- Árboles decorativos cercanos centralizados en drawNaturalForest().
- Carteles redibujados sin texto duplicado/superpuesto.
- Monitos forman una fila vertical al subir lianas.
- HUD oculto en PC.
- Controles inferiores eliminados.
- Joystick virtual + salto superpuestos en celular/tablet.
- Eliminada opción "Música: suave" del menú inicial.
- Proyecto dividido en tres archivos para GitHub Pages.


CLEANUP v2
- Repoblado el bosque con árboles nuevos anclados sólo a zonas con piso real.
- No se reactivó el sistema viejo que generaba troncos/árboles flotantes.
- Pantalla PC ampliada hasta 96% del ancho del navegador (máx. 1440 px).


POLISH 0.1
- F1 activa/desactiva coordenadas X/Y del Profe Gorila.
- Monitos llegan a la liana y suben en fila debajo del Profe.
- Agregadas 3 lianas alternativas en la Ruta Alta.
- Retirada la mecánica de mochilas del Nivel 1.
- Fuerza y resumen final ya no dependen de mochilas.


POLISH 0.2 — aventura / Zelda-like
- Lianas recalibradas: 3 corregidas + 6 nuevas.
- Corregido cartel del Gran Árbol cerca de X 8541.
- Eliminada rama frontal que tapaba la escuela.
- Seguidores arreglados en lianas (sin teleport visual / sin desaparecer).
- F2: teletransporte de prueba por coordenadas X,Y.
- HUD mínimo: bananas + un slot de objeto.
- A: comer banana (consume 1; efecto final pendiente).
- S: salto (Space/↑ siguen funcionando).
- D: usar objeto.
- Pila importante al comienzo; fanfarria + pose de 2 s.
- Radio en X 5318/Y 477: apagada hasta usar la pila.
- Franchu, Vitti y Lucy esperan tristes junto a la radio, bailan al repararla y luego siguen al Profe.
- Botones A/S/D añadidos también para táctil.

HOTFIX POLISH 0.2
- Corregida inicialización de heldItem / radioQuestSolved.
- El juego vuelve a construir el nivel y arrancar normalmente.


POLISH 0.3 — Música como herramienta
- Martu reubicada al comienzo; no participa del puzle de la radio.
- Ukelele retirado del mapa; sus funciones quedan disponibles para futuros niveles.
- A toca el instrumento encontrado.
- Trompeta: instrumento del Nivel 1.
- Cada interpretación dura 5 s y cuesta 1 banana.
- 4 monitos distraídos reaccionan a música cercana y luego siguen al Profe.
- HUD circular: bananas / instrumento / objeto.
- F1 movido a la derecha.
- Pila agrandada.
- Mensajes emergentes desactivados.
- D incorrecto reproduce sonido breve de “no funciona”.
- Ramas frontales que tapaban la escuela retiradas.

POLISH 0.4 — aventura vertical y comunicación
- Árbol vertical inicial X 1242–2113: Martu visible, bananas y trompeta arriba.
- Trompeta retirada del final del nivel.
- A ahora funciona manteniendo: se puede caminar mientras el Profe toca.
- Cada bloque de hasta 5 s de música consume 1 banana.
- Radio de efecto aproximado: 470 unidades.
- Dos paradas del grupo donde los monitos piden música con burbuja 🎵🙏.
- Árbol de la pila en X ~7318 con ramas rompibles.
- Dos monitos se pasan la pila; puede interceptarse en salto o resolverse con trompeta.
- Globos emoji para abrazo, festejo de ítem, música, sorpresa y diversión.
- Distraídos se mueven junto al animal/bichito que observan.
- F2 ahora abre panel: ↓ copia posición actual, ↑ recupera última coordenada, Enter teleporta.

POLISH 0.5: Martu ruido, arboles/ramas, camara, coco+ramita+zapatillas, salto 75%, inventario multiple, controles A/S/D/F y mobile 2 acciones.

POLISH 0.5.2 STABLE HOTFIX: rehecho desde 0.5 estable; corrige cámara vertical batería, rama, gorila saltador+coco, Martu y captura de pila en ápice.

POLISH 0.5.3 — STABILITY FIX
- Corregido crash del gorila del coco: usaba la constante inexistente GRAV.
- Corregido crash al lanzar la rama: usaba la misma constante inexistente GRAV.
- No se modificaron cámara, mapa, inventario ni mecánicas adicionales.

POLISH 0.5.4 — CAMERA + JUMP
- Cámara corregida desde X~5014: zonas exclusivas y seguimiento siempre sobre el Profe.
- Árbol de trompeta visible en todo su rango vertical.
- Árbol de la pila visible en todo su rango vertical.
- Liana X4235/Y170 -> X4133/Y243.
- Liana X4677/Y20 -> X4539/Y104.
- Salto base aumentado ~20% respecto de 0.5.3: 491 -> 589.
- Boost de salto mantenido aumentado proporcionalmente: 420 -> 504.
- Zapatillas conservan el salto completo original.
- No se tocaron rama, pila, gorila ni sistema musical.

POLISH 0.5.5b ESTABLE + REDISEÑO
- Reconstruida desde 0.5.4 estable.
- Profe Gorila: misma planilla de 17 frames, uniforme recoloreado a celeste/azul segun el nuevo diseño.
- Fallback procedimental tambien usa uniforme celeste.
- Martu no puede rescatarse mientras duerme.
- Camara vertical con zona segura.
- Rama deja de generarse como objeto; activa evento de monito del bosque + pelota.
- Pelota se recoge, aparece en HUD y se lanza con D.
- Pelota rompe el coco y da zapatillas.
- Codigo viejo de rama se conserva dormido para evitar regresiones destructivas.

POLISH 0.5.5c RENDER FIX
- Definida constante LEVEL_W=13760 usada por cámara, rama y pelota.
- Corregido freeze tras primer frame (ReferenceError: LEVEL_W is not defined).
- Eliminado duplicado de overlay visual de salto.

POLISH 0.5.6 — CAMERA REWRITE
- Cámara reescrita desde cero.
- Objetivo único: Profe Gorila.
- Perfiles: normal / vertical / tunnel / bigTree / school.
- Banda segura vertical 25%-75%.
- F1 muestra el perfil CAM activo.
- Sin cambios en física, sprites, Martu, pelota, música ni plataformas.

POLISH 0.5.6a — CAMERA CONTINUITY
- Agregado perfil highRoute para la ruta aérea.
- La cámara ya no vuelve a normal al salir del árbol de la pila mientras el Profe sigue en altura.
- Protección adicional contra clamps de suelo cuando el Profe sigue alto.
- F1 puede mostrar CAM: highRoute.
- Sin cambios en mecánicas, física u objetos.

POLISH 0.5.7
- Pelota lanzada visible con estela.
- Gorila liberado aterriza y camina hacia la escuela.
- Ajuste de cuatro lianas.
- Martu más baja; la pelota puede despertarla sin dañarla.
- Festejos con seguidores distintos.
- Río X9666–11400 con piedras resbaladizas.
- Monito del río agarrado a un palo.
- Seguidores esperan en la orilla.
- Pelota ofrece solución alternativa al rescate del río.

POLISH 0.5.8 — LEVEL 1 COMPLETE
- Río continuo visible X9666–11400.
- Caer al agua ya no manda al vacío.
- Corriente fuerte empuja hacia atrás.
- Piedras visualmente pulidas y mantienen efecto resbaladizo.
- Followers esperan en la orilla mientras el Profe cruza.
- Monito del río nada solo hasta tierra antes de sumarse al grupo.
- Pelota sigue siendo solución alternativa para liberarlo del palo.
- Cámara 0.5.6a sin cambios.

POLISH 0.5.9 — FINAL POLISH
- Gorila liberado: camina, hace pequeños saltos y puede usar lianas cercanas.
- Río: agua continua y dibujada por encima de la línea de las piedras.
- Piedras visualmente parcialmente sumergidas.
- Árbol vertical inicial bajado 40 px.
- Árbol de batería bajado 55 px.
- Monito de la pelota ahora la cabecea/juega con ella.
- Cámara 0.5.6a y resto del Nivel 1 sin cambios.

POLISH 0.6.0 — PORTADA
- Nueva pantalla de portada.
- Busca la imagen en: img/caminoescuelaportada.png
- La zona "EMPEZAR A JUGAR" funciona como botón transparente.
- Click/touch oculta la portada e inicia el juego.
- No se incrustó la imagen: hay que colocar caminoescuelaportada.png en la carpeta img del proyecto.

POLISH 0.6.1
- Portada -> cortina narrativa -> juego; eliminado el segundo menú inicial.
- Pelota: mantener D carga fuerza, soltar D lanza; parábola, inercia y rebotes.
- Coco: sólo un impacto en la cabeza libera al gorila.
- Gorila con pelota presente: saltos más altos/frecuentes.
- Gorila liberado: vuelve a la izquierda y queda reparando el autobús.
- Río: render mundial independiente hasta el fondo de pantalla para evitar desapariciones con la cámara.

POLISH 0.6.2 — HINTS + RIVER END ROCK
- Monitos cercanos pueden sugerir con emojis que la pelota debe golpear el coco.
- La pista aparece sólo si el Profe ya tiene la pelota, está cerca y pasan unos segundos.
- Se eligen followers distintos para las pistas.
- Se agregó una gran roca de ribera al final del río para cubrir el hueco visual.
- NO se modificó drawWorldRiver ni updateRiverPhysics.
