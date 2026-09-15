# Integración de Autenticación (Frontend - Angular)

Todo el backend está configurado y listo para que puedas implementar el Login y Registro desde tu aplicación Angular.

A continuación, te detallo cómo funcionan los endpoints, qué datos debes enviar y cómo manejar el token.

## Configuración Global

- **URL Base:** `http://localhost:8080` (asegúrate de agregar esto en tu `environment.ts` en Angular).
- **CORS:** Ya está configurado en el backend (`WebConfig.java`) para permitir peticiones desde `http://localhost:4200` (puerto por defecto de Angular).
- **Formato de Respuesta:** Todas las respuestas de la API, exitosas o fallidas, siguen un formato estándar (wrapper):

```typescript
// Modelo base que puedes usar en Angular
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T; // Puede ser null en caso de error
}
```

---

## 1. Login (Iniciar Sesión)

Este endpoint valida las credenciales y devuelve el token JWT.

- **URL:** `POST /api/v1/auth/login`
- **Autenticación requerida:** Ninguna (es un endpoint público).

### Payload (Body de la petición)

```json
{
  "username": "tu_usuario",
  "password": "tu_password_secreto"
}
```

### Respuesta Exitosa (HTTP 200 OK)

```json
{
  "success": true,
  "message": "Inicio de sesión exitoso.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhd...", // Token JWT
    "username": "tu_usuario",
    "email": "usuario@correo.com"
  }
}
```

### Posibles Errores

- **HTTP 401 Unauthorized:** Si las credenciales son incorrectas.
```json
{
  "success": false,
  "message": "Credenciales incorrectas.",
  "data": null
}
```

---

## 2. Registro (Crear Usuario)

Si vas a tener un formulario de registro en el frontend, este es el endpoint a utilizar.

- **URL:** `POST /api/v1/auth/register`
- **Autenticación requerida:** Ninguna.

### Payload (Body de la petición)

```json
{
  "username": "nuevo_usuario",
  "email": "nuevo@correo.com",
  "password": "password_seguro_123",
  "roleCode": "ADMIN" // Opcional. Si no se envía, por defecto es "SECRETARIA"
}
```
*(Nota: Los roles válidos según la base de datos son `ADMIN`, `ODONTOLOGO` y `SECRETARIA`).*

### Respuesta Exitosa (HTTP 201 Created)

```json
{
  "success": true,
  "message": "Usuario registrado exitosamente.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJudWV2b191c3Vhcmlv...",
    "username": "nuevo_usuario",
    "email": "nuevo@correo.com"
  }
}
```

### Posibles Errores

- **HTTP 409 Conflict:** Si el username o el email ya existen.
- **HTTP 400 Bad Request:** Si faltan datos o el formato del correo es inválido (errores de validación).

---

## 3. Uso del Token JWT en Angular

Una vez que el usuario hace login y obtienes el `token` de la respuesta, debes guardarlo en Angular (usualmente en `localStorage` o `sessionStorage`).

Para acceder a las rutas protegidas (ej. pacientes, profesionales, usuarios), debes enviar este token en los **Headers** de cada petición HTTP.

### Formato del Header

```
Authorization: Bearer <AQUI_VA_EL_TOKEN>
```

### Implementación en Angular (Recomendación)

Debes crear un **HTTP Interceptor** en Angular que se encargue de adjuntar automáticamente este Header a todas tus peticiones salientes hacia la API.

> [!TIP]
> **Interceptores en tu estructura:** Vi que en tu frontend tienes la carpeta `core/interceptors/`. Allí puedes crear o modificar tu `auth.interceptor.ts` para que tome el token de tu servicio de estado y lo inyecte usando `request.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } })`.

---

## ¿Está todo listo del lado del Backend?

**¡Sí, absolutamente todo está listo!** 

1. **La Base de Datos** tiene los roles y permisos iniciales (`V1__initial_schema.sql`).
2. **Spring Security** está protegiendo las rutas y generando JWT válidos.
3. **CORS** está habilitado para que Angular pueda comunicarse sin errores de bloqueo en el navegador.
4. **Swagger** está disponible (`http://localhost:8080/swagger-ui.html`) por si quieres probar los endpoints manualmente antes de programar en Angular.

Puedes proceder con total confianza a implementar tus servicios y componentes en Angular.
