const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt"); //libreria para generar y comparar contraseña encriptada
const jwt = require("jsonwebtoken");
require("dotenv").config();

//front envia un json, se busca en la base y se compara la contraseña
router.post("/login", async (req, res) => {
  //defino la ruta
  const { usuario, password } = req.body;

  try {
    //busco el usuario por su nombre de usuario
    const [results] = await pool.execute("SELECT * FROM usuarios WHERE usuario = ?", [
      usuario,
    ]);

    if (results.length === 0) {
      return res.status(401).json({ error: "No se encuentra el usuario" });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password_hash); // comparo la contraseña enviada por el usuario con el password_hash de la BD
    if (!match) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      //jwt para autenticar, expira en 2h
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Login exitoso", token, rol: user.rol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/*async function generar() {
  const passwordPlano = "1234";
  const hash = await bcrypt.hash(passwordPlano, 10);
  console.log("Hash generado:", hash);
}

generar();*/

module.exports = router;
