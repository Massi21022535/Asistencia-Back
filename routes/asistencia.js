const express = require("express");
const router = express.Router();
const pool = require("../db");

// el alumno registra asistencia ingresando su dni
router.post("/marcar", async (req, res) => {
  // defino la ruta
  const { token, nro_documento } = req.body;

  try {
    // busco la clase asociada al token
    const [clases] = await pool.execute(
      "SELECT id, comision_id FROM clases WHERE qr_token = ?",
      [token]
    ); // busco en la tabla clases el qr_token que coincide con el token que le paso
    if (clases.length === 0) {
      return res.status(400).json({ error: "Token inválido" }); //si no lo encuentra devuelve esto
    }
    const claseId = clases[0].id;
    const comisionId = clases[0].comision_id; //si lo encuentra lo guardo

    // verifico si el alumno con ese dni está inscripto en esa comisión
    const [alumnos] = await pool.execute(
      `SELECT a.id 
       FROM alumnos a
       JOIN inscripciones i ON i.alumno_id = a.id
       WHERE a.nro_documento = ? AND i.comision_id = ?`,
      [nro_documento, comisionId]
    );

    if (alumnos.length === 0) {
      return res
        .status(403)
        .json({ error: "El alumno no está inscripto en esta comisión" });
    }

    const alumnoId = alumnos[0].id;

    //registrar asistencia. se inserta la asistencia en la tabla, si ya lo hizo se ignora.
    await pool.execute(
      `INSERT IGNORE INTO asistencias (alumno_id, clase_id) VALUES (?, ?)`,
      [alumnoId, claseId]
    );

    res.json({ message: "Asistencia registrada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
});

module.exports = router;
