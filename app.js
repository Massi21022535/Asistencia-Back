require("dotenv").config();
const express = require("express");
const cors = require("cors"); // para conectarme con el front
const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./db");
const { verificarToken, soloRol } = require("./middlewares/auth"); //para validar usuario y roles

//importo las modulos con las rutas. cada una tiene sus endpoints
const usuariosRoutes = require("./routes/usuarios");
const profesorRoutes = require("./routes/profesor");
const asistenciaRoutes = require("./routes/asistencia");
const directorRoutes = require("./routes/director");

const corsOptions = {
  origin: process.env.FRONTEND_URL 
};
app.use(cors(corsOptions));
app.use(express.json());

//monto los routers en las rutas base
app.use("/asistencia", asistenciaRoutes);
app.use("/director", directorRoutes);
app.use("/profesor", profesorRoutes);
app.use("/usuarios", usuariosRoutes);

//prueba del backend
app.get("/", (req, res) => {
  res.send("Servidor Funcionando");
});

//arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
