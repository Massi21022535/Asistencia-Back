const express = require("express");
const router = express.Router();
const pool = require("../db");
const {verificarToken, soloRol} = require("../middlewares/auth");

// listo todas las materias y comisiones. devuelvo la lista completa de materias y comisiones, no tiene restriccion porque el director ve todo
router.get("/materias", verificarToken, soloRol("director"), async(req,res) => { // defino la ruta
    try{
        const [materias] = await pool.execute( // este query une comisiones con materias
            `SELECT m.id AS materia_id, m.nombre AS materia,
                    c.id AS comision_id, c.nombre AS comision
            FROM comisiones c
            JOIN materias m ON m.id = c.materia_id`  
        );
        res.json(materias);

    } catch(err){
        console.error(err);
        res.status(500).json({error: "Error al obtener materias"});
    }
});

// porcentaje de asistencia de alumnos de una comision
router.get("/comisiones/:id/asistencias", verificarToken, soloRol("director"), async (req, res) => { //defino la ruta
  const comisionId = req.params.id;

  try {
    const [alumnos] = await pool.execute(
      `SELECT a.id AS alumno_id, a.apellido, a.nombres,
              COUNT(DISTINCT asi.id) AS presentes,
              COUNT(DISTINCT c.id) AS total,
              ROUND((COUNT(DISTINCT asi.id) / COUNT(DISTINCT c.id)) * 100, 2) AS porcentaje
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       JOIN comisiones co ON co.id = i.comision_id
       JOIN clases c ON c.comision_id = co.id
       LEFT JOIN asistencias asi ON asi.alumno_id = a.id AND asi.clase_id = c.id
       WHERE co.id = ?
       GROUP BY a.id, a.apellido, a.nombres`,
      [comisionId]
    );

    res.json(alumnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener asistencias" });
  }
});

module.exports = router;