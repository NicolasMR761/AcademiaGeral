const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  uiConfirm: (title, message) =>
    ipcRenderer.invoke("ui:confirm", { title, message }),
  

  // navegación + auth
  openPage: (page) => ipcRenderer.invoke("nav:open", { page }),
  login: (username, password) =>
    ipcRenderer.invoke("auth:login", { username, password }),

  // alumnos
  listAlumnos: () => ipcRenderer.invoke("alumnos:list"),
  createAlumno: (a) => ipcRenderer.invoke("alumnos:create", a),
  updateAlumno: (id, changes) =>
    ipcRenderer.invoke("alumnos:update", { id, changes }),
  deleteAlumno: (id) => ipcRenderer.invoke("alumnos:delete", { id }),

  // profesores
  listProfesores: () => ipcRenderer.invoke("profesores:list"),
  createProfesor: (p) => ipcRenderer.invoke("profesores:create", p),
  updateProfesor: (id, changes) =>
    ipcRenderer.invoke("profesores:update", { id, changes }),
  deleteProfesor: (id) => ipcRenderer.invoke("profesores:delete", { id }),

  // clases
  listClases: () => ipcRenderer.invoke("clases:list"),
  createClase: (c) => ipcRenderer.invoke("clases:create", c),
  updateClase: (id, changes) =>
    ipcRenderer.invoke("clases:update", { id, changes }),
  deleteClase: (id) => ipcRenderer.invoke("clases:delete", { id }),

  // asistencia
  listAsistencia: (filter) =>
    ipcRenderer.invoke("asistencia:list", filter || {}),
  checkin: (input) => ipcRenderer.invoke("asistencia:checkin", input),
  checkout: (input) => ipcRenderer.invoke("asistencia:checkout", input),
  deleteAsistencia: (id) => ipcRenderer.invoke("asistencia:delete", { id }),

  // lookups (para selects)
  lookupAlumnos: () => ipcRenderer.invoke("lookup:alumnos"),
  lookupProfesores: () => ipcRenderer.invoke("lookup:profesores"),

  // reportes
  reportAsistenciaRango: (filter) =>
    ipcRenderer.invoke("report:asistenciaRango", filter || {}),

  // Pagos
  listPagos: (filter) => ipcRenderer.invoke("pagos:list", filter || {}),
  createPago: (input) => ipcRenderer.invoke("pagos:create", input),
  deletePago: (id) => ipcRenderer.invoke("pagos:delete", { id }),

  // Exportar pagos a Excel
  exportPagosExcel: (payload) =>
    ipcRenderer.invoke("export:pagosExcel", payload),
  exportAsistenciaExcel: (filter) =>
    ipcRenderer.invoke("asistencia:exportExcel", filter),
  

  uiFocus: () => ipcRenderer.invoke("ui:focus"),

  // Licencias
  licenseStatus: () => ipcRenderer.invoke("license:status"),
  licenseMachine: () => ipcRenderer.invoke("license:machine"),
  licenseActivate: (token) => ipcRenderer.invoke("license:activate", { token }),
});
