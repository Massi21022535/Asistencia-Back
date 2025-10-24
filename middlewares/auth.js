const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; //bearer token

  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ error: "Token invalido o expirado" });
    req.user = user; //guardo el id y el rol del user en la req
    next();
  });
}

function soloRol(rol) {
  return (req, res, next) => {
    if (req.user.rol != rol) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    next();
  };
}

module.exports = { verificarToken, soloRol };
