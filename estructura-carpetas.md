# Estructura de carpetas — LasDosCaras

Referencia para pedirle a Claude Code que la genere en tu primera sesión
("Claude, crea esta estructura de carpetas dentro de src/, con archivos
placeholder mínimos"), o para ir armándola pantalla por pantalla.

```
lasdoscaras-frontend/
├── .env.example
├── .env                      # no se sube (en .gitignore)
├── .gitignore
├── README.md
├── CLAUDE.md
├── NOTAS-DEFENSA.md          # tu chuleta personal, opcional subir a git
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar.tsx
    │   │   └── Footer.tsx
    │   ├── ui/
    │   │   ├── Toast.tsx
    │   │   ├── Spinner.tsx
    │   │   ├── ThemeToggle.tsx
    │   │   └── EmptyState.tsx
    │   └── publicaciones/
    │       ├── TarjetaPublicacion.tsx   # la reutilizan casi todas las pantallas
    │       └── GridPublicaciones.tsx
    │
    ├── pages/
    │   ├── tablero/
    │   │   └── TableroPage.tsx
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   └── RegistroPage.tsx
    │   ├── publicacion/
    │   │   ├── DetallePublicacionPage.tsx
    │   │   └── CrearEditarPublicacionPage.tsx
    │   ├── categoria/
    │   │   └── CategoriaPage.tsx
    │   ├── busqueda/
    │   │   └── BusquedaPage.tsx
    │   ├── perfil/
    │   │   ├── PerfilUsuarioPage.tsx
    │   │   └── PerfilAutorPage.tsx
    │   ├── admin/
    │   │   ├── AdminUsuariosPage.tsx
    │   │   ├── AdminCategoriasPage.tsx
    │   │   └── AdminModeracionPage.tsx
    │   └── error/
    │       └── ErrorPage.tsx           # 404 / 403
    │
    ├── services/
    │   ├── httpClient.ts                # cliente base, interceptor Bearer
    │   ├── authService.ts
    │   ├── publicacionesService.ts
    │   ├── categoriasService.ts
    │   ├── hashtagsService.ts
    │   ├── comentariosService.ts
    │   ├── usuariosService.ts           # admin
    │   └── cacheService.ts              # único módulo que toca localStorage
    │
    ├── context/
    │   ├── AuthContext.tsx
    │   └── authReducer.ts
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useDebounce.ts
    │   └── useOnlineStatus.ts
    │
    ├── routes/
    │   ├── AppRoutes.tsx
    │   ├── AuthGuard.tsx
    │   └── RoleGuard.tsx
    │
    ├── types/
    │   ├── usuario.ts
    │   ├── publicacion.ts
    │   ├── categoria.ts
    │   ├── hashtag.ts
    │   ├── comentario.ts
    │   └── api.ts                       # tipos de error/respuesta genéricos
    │
    └── utils/
        ├── formatters.ts
        └── validators.ts
```

## Notas sobre esta estructura

- `services/cacheService.ts` es el **único** archivo del proyecto que llama
  `localStorage.getItem` / `setItem` directamente. Todo lo demás lo consume
  a través de él.
- `components/publicaciones/TarjetaPublicacion.tsx` la usan Tablero,
  Categoría, Búsqueda y Perfil de Autor — constrúyela una sola vez y
  reutilízala, no la dupliques por pantalla.
- Cada carpeta bajo `pages/` corresponde a una rama `feature/...` distinta,
  lo que facilita que los Pull Requests no choquen entre integrantes.
