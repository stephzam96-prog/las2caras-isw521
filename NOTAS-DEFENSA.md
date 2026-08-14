# Notas de defensa — LasDosCaras

> Chuleta personal para repasar antes de la defensa oral (40% de la nota,
> individual). Por cada pantalla/feature que termines con Claude Code,
> pedile un resumen y pegalo acá con tus propias palabras después de
> entenderlo — no copies y pegues sin leer.

Formato sugerido por entrada:

## [Nombre de la pantalla o feature]
- **Qué hace:** ...
- **Endpoints del API que usa:** ...
- **Decisiones de diseño y por qué:** ...
- **Qué localStorage toca (si aplica):** ...
- **Puntos donde podrían preguntarme algo tricky:** ...
- **Cosas que no me quedan 100% claras — repasar antes de defender:** ...

---

## Sprint 0 — Núcleo compartido
- **Qué hace:**
- **Decisiones de diseño y por qué:**
- **Puntos donde podrían preguntarme algo tricky:**

---

## Autenticación
- Decisión: errores 400 se muestran como lista, no por campo, porque 
  la API agrupa todos los mensajes de validación bajo "body" (no 
  separa por nombre de input). Verificado contra la API real, no es 
  una suposición.

## Tablero / TarjetaPublicacion
- Decisión: no se muestra un contador combinado de likes/dislikes de
  ambos lados. Cada lado (A/B) muestra su propio contador, de forma
  independiente, para respetar la regla del enunciado de que los dos
  lados son entidades separadas — un total combinado además quedaría
  desincronizado si solo reaccionás a un lado.
- Reacciones: estado local en TarjetaPublicacion, se actualiza con la
  respuesta del POST sin que el padre (Tablero) necesite saberlo.

---
## Búsqueda
- Decisión: /api/search devuelve datos parciales de las publicaciones 
  (sin likeCount, sin sides completos), distinto a GET /views. Por eso 
  Búsqueda usa un tipo TypeScript propio y una tarjeta de resultado 
  liviana, en vez de forzar los datos parciales dentro del tipo View 
  completo con un `as any` (que hubiera violado la regla de no-any 
  del proyecto y podía romper en runtime).

## Login
## Registro
## Crear/Editar Publicación
## Perfil de Usuario
## Detalle de Publicación
## Admin — Usuarios
## Admin — Categorías
## Admin — Moderación
