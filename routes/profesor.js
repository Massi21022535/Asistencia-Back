const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verificarToken, soloRol } = require("../middlewares/auth"); //para asegurar que el rol sea profesor
const { v4: uuidv4 } = require("uuid"); //para generar tokens unicos (qr_token)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001"; //url del frontend

//listo materias que dicta el profesor y devuelvo todas las materias y comisiones que dicta. protegida solo para rol profesor
router.get(
  "/materias",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    //defino la ruta
    try {
      const [materias] = await pool.execute(
        //traigo las materias y comisiones que dicta ese profesor. profesor_comision relaciona usuario_id con comision_id
        `SELECT m.id AS materia_id, m.nombre AS materia,
       c.id AS comision_id, c.nombre AS comision
       FROM profesor_comision pc
       JOIN comisiones c ON c.id = pc.comision_id
       JOIN materias m ON m.id = c.materia_id
       WHERE pc.usuario_id = ?`,
        [req.user.id]
      );
      res.json(materias);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener materias" });
    }
  }
);

// porcentaje de asistencia de alumnos de una comision
router.get(
  "/comisiones/:id/asistencias",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    //ruta
    const comisionId = req.params.id;

    try {
      //valido que el profesor dicte esa comision
      const [check] = await pool.execute(
        "SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?",
        [req.user.id, comisionId]
      );
      if (check.length === 0) {
        return res
          .status(403)
          .json({ error: "No tienes acceso a esta comisión" });
      }

      const [alumnos] = await pool.execute(
        //lo mismo que para el director. relaciono inscripciones clases y asistencias y traigo la lista de alumnos con porcentajes
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
  }
);

//creo nueva clase, agrego la clase a la tabla clases y se genera el QR.
router.post(
  "/comisiones/:id/clases",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    const comisionId = req.params.id;
    const fecha = new Date();
    const { manual, contenido } = req.body;

    try {
      // verifico acceso del profesor
      const [check] = await pool.execute(
        `SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?`,
        [req.user.id, comisionId]
      );
      if (check.length === 0) {
        return res
          .status(403)
          .json({ error: "No tenes acceso a esta comisión" });
      }

      let qrToken = null;
      if (!manual) {
        qrToken = uuidv4();
      }

      const [result] = await pool.execute(
        `INSERT INTO clases (comision_id, fecha, qr_token, contenido) VALUES (?, ?, ?, ?)`,
        [comisionId, fecha, qrToken, contenido || null]
      );

      const nuevaClaseId = result.insertId;

      if (manual) {
        return res.json({
          message: "Clase manual creada correctamente",
          clase_id: nuevaClaseId,
        });
      } else {
        const qrUrl = `${FRONTEND_URL}/asistencia?token=${qrToken}`;
        return res.json({
          message: "Clase creada",
          qr_url: qrUrl,
          token: qrToken,
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear la clase" });
    }
  }
);

//listo los alumnos de una comision
router.get(
  "/comisiones/:id/alumnos",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    //ruta
    const comisionId = req.params.id;

    try {
      // valido que el profesor dicte esa comision
      const [check] = await pool.execute(
        `SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?`,
        [req.user.id, comisionId]
      );

      if (check.length === 0) {
        return res
          .status(403)
          .json({ error: "No tienes acceso a esta comisión" });
      }

      const [alumnos] = await pool.execute(
        // listo los alumnos inscriptos en esa comision
        `SELECT a.id, a.legajo, a.apellido, a.nombres
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       WHERE i.comision_id = ?`,
        [comisionId]
      );

      res.json(alumnos);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener alumnos" });
    }
  }
);

//listar todas las clases creadas de una comision
router.get(
  "/comisiones/:id/clases",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    //ruta
    const comisionId = req.params.id;

    try {
      // valido que el profesor dicte esa comision
      const [check] = await pool.execute(
        "SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?",
        [req.user.id, comisionId]
      );

      if (check.length === 0) {
        return res
          .status(403)
          .json({ error: "No tienes acceso a esta comisión" });
      }

      const [clases] = await pool.execute(
        //obtengo las clases de esa comision ordenadas por fecha
        `SELECT id, fecha, qr_token, contenido, created_at 
       FROM clases 
       WHERE comision_id = ?
       ORDER BY fecha DESC`,
        [comisionId]
      );

      res.json(clases);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener clases" });
    }
  }
);

router.delete(
  "/comisiones/:id/clases/:claseId",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    //ruta
    const { id, claseId } = req.params;

    try {
      //valido que la clase sea de esa comisión y que el profesor tenga permiso
      const [result] = await pool.execute(
        "DELETE FROM clases WHERE id = ? AND comision_id = ?",
        [claseId, id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Clase no encontrada o no pertenece a la comisión" });
      }

      res.json({ message: "Clase eliminada correctamente" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar la clase" });
    }
  }
);

// Registrar asistencias manuales de una clase
router.post(
  "/comisiones/:id/clases/:claseId/asistencias",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    const { id, claseId } = req.params;
    const { presentes } = req.body; // array con IDs de alumnos presentes

    try {
      // verifico acceso del profesor a la comisión
      const [check] = await pool.execute(
        "SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?",
        [req.user.id, id]
      );
      if (check.length === 0) {
        return res
          .status(403)
          .json({ error: "No tenes acceso a esta comisión" });
      }

      // inserto asistencias en bloque
      for (const alumnoId of presentes) {
        await pool.execute(
          "INSERT IGNORE INTO asistencias (alumno_id, clase_id) VALUES (?, ?)",
          [alumnoId, claseId]
        );
      }

      res.json({ message: "Asistencias registradas correctamente" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al registrar asistencias" });
    }
  }
);

// Obtener detalles de asistencia de una clase
router.get("/clases/:id/asistencias", verificarToken, soloRol("profesor"), async (req, res) => {
  const claseId = req.params.id;
  
  try {
    // Busco la comisión a la que pertenece la clase
    const [claseData] = await pool.execute(
      "SELECT comision_id FROM clases WHERE id = ?",
      [claseId]
    );

    if (claseData.length === 0) {
      return res.status(404).json({ error: "Clase no encontrada" });
    }

    const comisionId = claseData[0].comision_id;

    // Valido que el profesor tenga acceso a esa comisión
    const [check] = await pool.execute(
      "SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?",
      [req.user.id, comisionId]
    );

    if (check.length === 0) {
      return res.status(403).json({ error: "No tienes acceso a esta clase" });
    }

    // Busco todos los alumnos y marco si asistieron
    const [alumnos] = await pool.execute(
      `SELECT 
         a.id,
         a.apellido,
         a.nombres,
         CASE WHEN asis.alumno_id IS NOT NULL THEN 1 ELSE 0 END AS presente
       FROM alumnos a
       JOIN inscripciones i ON i.alumno_id = a.id
       LEFT JOIN asistencias asis ON asis.alumno_id = a.id AND asis.clase_id = ?
       WHERE i.comision_id = ?
       ORDER BY a.apellido, a.nombres`,
      [claseId, comisionId]
    );

    res.json(alumnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener asistencias de la clase" });
  }
});

//notas de los alumnos
router.post(
  "/comisiones/:id/alumnos/:alumnoId/notas",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    const { id: comisionId, alumnoId } = req.params;
    const { titulo, valor } = req.body;

    try {
      // validar acceso del profesor
      const [check] = await pool.execute(
        "SELECT 1 FROM profesor_comision WHERE usuario_id = ? AND comision_id = ?",
        [req.user.id, comisionId]
      );
      if (check.length === 0) {
        return res.status(403).json({ error: "No tienes acceso a esta comisión" });
      }

      await pool.execute(
        "INSERT INTO notas (alumno_id, comision_id, titulo, valor) VALUES (?, ?, ?, ?)",
        [alumnoId, comisionId, titulo, valor]
      );

      res.json({ message: "Nota registrada correctamente" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al registrar nota" });
    }
  }
);

//listar las notas
router.get(
  "/comisiones/:id/alumnos/:alumnoId/notas",
  verificarToken,
  soloRol("profesor"),
  async (req, res) => {
    const { id: comisionId, alumnoId } = req.params;

    try {
      const [notas] = await pool.execute(
        "SELECT id, titulo, valor, created_at FROM notas WHERE alumno_id = ? AND comision_id = ? ORDER BY created_at DESC",
        [alumnoId, comisionId]
      );
      res.json(notas);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener notas" });
    }
  }
);

module.exports = router;
