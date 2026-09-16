# Rage Training 2.4.58 — Protección del guardado local

## Corrección

La pantalla inicial podía abrir Resumen antes de cargar clientes. Resumen ejecutaba comprobaciones que guardaban la colección todavía vacía. Esta versión carga y valida la información antes de que cualquier componente pueda guardarla. La splash queda limitada a presentación: no abre Resumen, no calcula bonos y no guarda datos.

La información se conserva en `rageTraining:database:v1`. Clientes y entrenadores se escriben juntos en una operación. Las claves antiguas son solo espejos de compatibilidad: una pestaña anterior puede alterarlas, pero la nueva aplicación continúa leyendo la base protegida. No se activa Supabase.

Se conserva la versión inmediatamente anterior en `rageTraining:database:previous:v1`. Una copia dentro del navegador no sustituye a una exportación externa. No hay recuperación automática que sobrescriba silenciosamente datos.

## Protecciones

- Validación de lectura: un error no se interpreta como lista vacía.
- Rechazo de pérdidas de registros sin borrado confirmado.
- Una única pestaña editora por navegador y dispositivo mediante Web Locks. La segunda pide cerrar la primera y pulsar Continuar. Esta protección NO sincroniza dispositivos.
- Comprobación de revisión antes de escribir; una alteración externa bloquea el guardado obsoleto.
- Las escrituras directas de los módulos anteriores, incluidas recurrencias, pasan por la misma protección.
- Los cambios de seguimiento de la persona activa se guardan también dentro de su ficha individual.
- Exportación e importación utilizan la base protegida.
- Sin reescrituras cuando no cambian los datos.
- Ante falta de espacio o bloqueo de almacenamiento se conserva la última base y se muestra un aviso.
- Si falta el módulo de protección, el arranque se bloquea antes de permitir las escrituras antiguas.
- Navegadores sin Web Locks no se habilitan para editar; utilizar Chrome actualizado y el enlace HTTPS de la PWA.

## Pruebas realizadas

16 comprobaciones automáticas superadas con Node.js 22, contextos JavaScript separados y dobles de prueba para Storage, Web Locks y DOM. Se usan funciones extraídas del arranque y guardado de app.js y datos ficticios. Estas son pruebas aisladas de lógica, NO una prueba end-to-end de toda la aplicación ni una validación física de las tablets.

1. Reproducción del borrado con el arranque anterior.
2. Conservación de tres fichas: individual, pareja y trío, con seguimiento y pagos.
3. 25 recargas/reaperturas simuladas con comparación de todos los datos.
4. Alta, pago y modificación de medición, seguidos de reapertura.
5. Persistencia de 16 sesiones recurrentes mediante la ruta de escritura directa.
6. Pestaña antigua escribiendo una lista vacía sin modificar la base protegida.
7. Segunda pestaña bloqueada y habilitada al cerrar la primera.
8. Rechazo del vaciado accidental.
9. Conservación de una copia anterior completa antes de escribir.
10. 100 aperturas del resumen sin reescritura de datos idénticos.
11. Borrado confirmado, incluido el último cliente.
12. Importación conjunta de clientes y entrenadores.
13. Exportación de la base protegida, no del espejo antiguo.
14. Lectura ilegible sin sustitución por una colección vacía.
15. Fallo simulado por falta de espacio, conservando la última versión guardada.
16. Rechazo de una sobrescritura tras un cambio externo inesperado.

Módulo probado: `persistencia-v2.4.58.js`, blob SHA `f6a06a4051a35a4d0b1ea77fc7629a5c7a4b91fd`.

## Primera puesta en uso

Cerrar las pestañas y la PWA anteriores, abrir el enlace actualizado con conexión y comprobar v2.4.58. Introducir una ficha de prueba con pago y sesión, cerrar y volver a abrir y verificar la conservación. Mientras no se active la sincronización, cada dispositivo conserva sus datos por separado. Exportar copia al finalizar la jornada de pruebas.
