const { app, BrowserWindow, ipcMain, dialog } = require("electron");

const path = require("path");
const db = require("./src/db");
const fs = require("fs");
const XLSX = require("xlsx");
const license = require("./src/license");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1050,
    minHeight: 680,
    show: false,
    showInactive: false,
    backgroundColor: "#000000",
    icon: path.join(__dirname, "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // ✅ Siempre cargar login
  win.loadFile(path.join(__dirname, "renderer", "login.html"));

  // ✅ Mostrar + tomar foco
  win.once("ready-to-show", () => {
    win.show();
    win.focus();
    if (typeof win.moveTop === "function") win.moveTop();
  });

  // ✅ Refuerzo (Windows a veces lo necesita)
  win.on("show", () => {
    win.focus();
  });
}

app.whenReady().then(() => {
  db.init();
  createWindow();
});

// ----- Licencias -----
ipcMain.handle("license:status", async () => {
  try {
    return { ok: true, status: license.checkStatus() };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("license:machine", async () => {
  try {
    return { ok: true, machineId: license.getMachineId() };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("license:activate", async (_evt, { token }) => {
  try {
    const res = license.activate(token);
    if (!res.ok) return res;
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const allowedPages = new Set([
  "login",
  "dashboard",
  "alumnos",
  "profesores",
  "clases",
  "asistencia",
  "pagos",
  "activacion",
]);

ipcMain.handle("auth:login", async (_evt, { username, password }) => {
  try {
    if (!username || !password)
      return { ok: false, message: "Completa usuario y contraseña." };
    const user = db.getUserByUsername(username.trim());
    if (!user) return { ok: false, message: "Usuario no encontrado." };
    const ok = db.verifyPassword(
      password,
      user.password_hash,
      user.password_salt,
    );
    if (!ok) return { ok: false, message: "Contraseña incorrecta." };
    return {
      ok: true,
      user: { id: user.id, username: user.username, role: user.role },
    };
  } catch (e) {
    return { ok: false, message: e.message || "Error login" };
  }
});

ipcMain.handle("alumnos:list", async () => {
  try {
    return { ok: true, alumnos: db.listAlumnos() };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
ipcMain.handle("alumnos:create", async (_evt, alumno) => {
  try {
    return { ok: true, alumno: db.createAlumno(alumno) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
ipcMain.handle("alumnos:update", async (_evt, { id, changes }) => {
  try {
    return { ok: true, alumno: db.updateAlumno(id, changes) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
ipcMain.handle("alumnos:delete", async (_evt, { id }) => {
  try {
    db.deleteAlumno(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("profesores:list", async () => {
  try {
    return { ok: true, profesores: db.listProfesores() };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
ipcMain.handle("profesores:create", async (_evt, profesor) => {
  try {
    return { ok: true, profesor: db.createProfesor(profesor) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
ipcMain.handle("profesores:update", async (_evt, { id, changes }) => {
  try {
    return { ok: true, profesor: db.updateProfesor(id, changes) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});
ipcMain.handle("profesores:delete", async (_evt, { id }) => {
  try {
    db.deleteProfesor(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("nav:open", async (evt, { page }) => {
  try {
    if (!allowedPages.has(page))
      return { ok: false, message: "Página inválida" };

    const win = BrowserWindow.fromWebContents(evt.sender);
    const filePath = path.join(__dirname, "renderer", `${page}.html`);

    await win.loadFile(filePath);
    return { ok: true };
  } catch (e) {
    if (e && (e.code === "ERR_ABORTED" || e.errno === -3)) {
      return { ok: true, aborted: true };
    }
    console.error("nav:open error:", e);
    return { ok: false, message: e.message || "Error abriendo página" };
  }
});

// ---------- Clases ----------
ipcMain.handle("clases:list", async () => {
  try {
    return { ok: true, clases: db.listClases() };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("clases:create", async (_evt, clase) => {
  try {
    return { ok: true, clase: db.createClase(clase) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("clases:update", async (_evt, { id, changes }) => {
  try {
    return { ok: true, clase: db.updateClase(id, changes) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("clases:delete", async (_evt, { id }) => {
  try {
    db.deleteClase(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

// ---------- Asistencia ----------
ipcMain.handle("asistencia:list", async (_evt, filter) => {
  try {
    return { ok: true, rows: db.listAsistencia(filter || {}) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("asistencia:checkin", async (_evt, input) => {
  try {
    return { ok: true, row: db.checkin(input) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("asistencia:checkout", async (_evt, input) => {
  try {
    return { ok: true, row: db.checkout(input) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("asistencia:delete", async (_evt, payload) => {
  try {
    const id = payload?.id;
    db.deleteAsistencia(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

// Lookups
ipcMain.handle("lookup:alumnos", async () => {
  try {
    return { ok: true, alumnos: db.listAlumnos() };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("lookup:profesores", async () => {
  try {
    return { ok: true, profesores: db.lookupProfesores() };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle("report:asistenciaRango", async (_evt, filter) => {
  try {
    return { ok: true, rows: db.reportAsistenciaRango(filter || {}) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("pagos:list", async (_evt, filter) => {
  try {
    return { ok: true, rows: db.listPagos(filter || {}) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("pagos:create", async (_evt, input) => {
  try {
    return { ok: true, row: db.createPago(input) };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

ipcMain.handle("pagos:delete", async (_evt, payload) => {
  try {
    db.deletePago(payload?.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message || "Error" };
  }
});

//Excel
ipcMain.handle("export:pagosExcel", async (_evt, payload) => {
  try {
    const rows = payload?.rows || [];
    const desde = payload?.desde || "";
    const hasta = payload?.hasta || "";

    // 1) Elegir dónde guardar
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Guardar reporte de pagos",
      defaultPath: `reporte_pagos_${desde || "inicio"}_${hasta || "fin"}.xlsx`,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return { ok: false, message: "Cancelado." };

    // 2) Preparar data para Excel
    const data = rows.map((r, i) => ({
      "#": i + 1,
      Fecha: r.fecha_pago || "",
      Tipo: r.tipo_persona || "",
      Documento: r.documento || "", // ✅ NUEVO
      Persona: r.persona_nombre || "",
      Periodicidad: r.periodicidad || "",
      Monto: Number(r.monto || 0),
      Método: r.metodo || "",
      Notas: r.notas || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Formato de ancho de columnas (opcional)
    ws["!cols"] = [
      { wch: 5 }, // #
      { wch: 12 }, // Fecha
      { wch: 10 }, // Tipo
      { wch: 16 }, // Documento ✅
      { wch: 30 }, // Persona
      { wch: 12 }, // Periodicidad
      { wch: 12 }, // Monto
      { wch: 15 }, // Método
      { wch: 30 }, // Notas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");

    // 3) Guardar
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(filePath, buffer);

    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, message: e.message || "Error exportando." };
  }
});

ipcMain.handle("asistencia:exportExcel", async (_e, filter) => {
  try {
    const rows = db.reportAsistenciaRango(filter || []);

    if (!rows || !rows.length) {
      return { ok: false, message: "No hay datos para exportar." };
    }

    // Formatear datos para Excel
    const data = rows.map((r) => ({
      Fecha: r.fecha || "",
      Tipo: r.tipo || "",
      Documento: r.documento || "", // ✅ NUEVO
      Persona: r.persona_nombre || "",
      Clase: r.clase_nombre || "",
      Entrada: r.hora_entrada || "",
      Salida: r.hora_salida || "",
      Notas: r.notas || "",
    }));

    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(data);

    // (Opcional) Ancho columnas para que "Documento" no quede cortado
    ws["!cols"] = [
      { wch: 12 }, // Fecha
      { wch: 10 }, // Tipo
      { wch: 16 }, // Documento ✅
      { wch: 30 }, // Persona
      { wch: 22 }, // Clase
      { wch: 10 }, // Entrada
      { wch: 10 }, // Salida
      { wch: 30 }, // Notas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

    // Guardar archivo
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Guardar reporte de asistencia",
      defaultPath: path.join(
        app.getPath("downloads"),
        `reporte_asistencia.xlsx`,
      ),
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) {
      return { ok: false, message: "Cancelado." };
    }

    XLSX.writeFile(wb, filePath);
    return { ok: true, path: filePath };
  } catch (e) {
    console.error("export asistencia excel error:", e);
    return { ok: false, message: e.message || "Error exportando Excel." };
  }
});

ipcMain.handle("ui:focus", (evt) => {
  try {
    const win = BrowserWindow.fromWebContents(evt.sender);
    win?.show();
    win?.focus();
    win?.webContents?.focus();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});
ipcMain.handle("ui:confirm", async (evt, { title, message }) => {
  try {
    const win = BrowserWindow.fromWebContents(evt.sender);

    const result = await dialog.showMessageBox(win, {
      type: "warning",
      title: title || "Confirmar",
      message: message || "¿Estás seguro?",
      buttons: ["Cancelar", "Aceptar"],
      defaultId: 1,
      cancelId: 0,
      noLink: true,
    });

    // reforzar foco al cerrar el diálogo
    win?.show();
    win?.focus();
    win?.webContents?.focus();

    return { ok: true, confirmed: result.response === 1 };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});
