# Paso 1 — Login + Alumnos + Profesores (Electron + SQLite)

## Requisito importante
Usa **Node 20 LTS**. (Con Node 24 suele fallar `better-sqlite3` en Windows.)

## Instalar / ejecutar
```bash
npm install
npm start
```

## Credenciales
- usuario: admin
- contraseña: admin

---

# Licencias offline (prueba 30 días + activación por meses)

La app inicia en **Login** si está en:
- **TRIAL** (prueba de 30 días), o
- **ACTIVE** (licencia vigente).

Si la prueba terminó (o se detecta que el reloj del sistema fue atrasado mucho), abre la pantalla **Activación**.

## Generar llaves
> Haz esto una sola vez y guarda la llave privada en secreto.

```bash
npm run license:keys
```

Se crean:
- `src/public_key.pem` (se empaca con la app)
- `tools/private_key.pem` (NO se debe compartir ni empacar)

## Generar licencia por meses

1) El cliente te envía el **Machine ID** (sale en la pantalla Activación).
2) Generas el token por meses:

```bash
npm run license:gen -- --machine <MACHINE_ID> --months 1 --customer "Academia X" --plan mensual
```

3) Le envías el **TOKEN** al cliente para pegarlo en la app.
