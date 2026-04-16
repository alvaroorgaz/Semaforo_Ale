const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "db.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readDB() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

function sanitizeKpi(payload) {
  return {
    id: payload.id || Date.now(),
    name: String(payload.name || "").trim(),
    description: String(payload.description || "").trim(),
    owner: String(payload.owner || "both").trim(),
    target: Number(payload.target),
    unit: String(payload.unit || "").trim(),
    alexandra: Number(payload.alexandra),
    eva: Number(payload.eva)
  };
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/login", (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  if (email === db.user.email && password === db.user.password) {
    return res.json({
      success: true,
      name: db.user.name,
      email: db.user.email
    });
  }

  return res.status(401).json({
    success: false,
    message: "Correo o contrasena incorrectos"
  });
});

app.get("/team", (_req, res) => {
  const db = readDB();
  res.json(db.team);
});

app.get("/kpis", (_req, res) => {
  const db = readDB();
  res.json(db.kpis);
});

app.post("/kpis", (req, res) => {
  const db = readDB();
  const newKpi = sanitizeKpi(req.body);

  if (
    !newKpi.name ||
    Number.isNaN(newKpi.target) ||
    Number.isNaN(newKpi.alexandra) ||
    Number.isNaN(newKpi.eva)
  ) {
    return res.status(400).json({
      ok: false,
      message: "Faltan datos obligatorios del KPI"
    });
  }

  db.kpis.push(newKpi);
  writeDB(db);
  return res.status(201).json(newKpi);
});

app.get("/kpis/:id", (req, res) => {
  const db = readDB();
  const kpi = db.kpis.find((item) => String(item.id) === String(req.params.id));

  if (!kpi) {
    return res.status(404).json({
      ok: false,
      message: "KPI no encontrado"
    });
  }

  return res.json(kpi);
});

app.put("/kpis/:id", (req, res) => {
  const db = readDB();
  const index = db.kpis.findIndex((item) => String(item.id) === String(req.params.id));

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      message: "KPI no encontrado"
    });
  }

  const updatedKpi = sanitizeKpi({
    ...req.body,
    id: db.kpis[index].id
  });

  if (
    !updatedKpi.name ||
    Number.isNaN(updatedKpi.target) ||
    Number.isNaN(updatedKpi.alexandra) ||
    Number.isNaN(updatedKpi.eva)
  ) {
    return res.status(400).json({
      ok: false,
      message: "Faltan datos obligatorios del KPI"
    });
  }

  db.kpis[index] = updatedKpi;
  writeDB(db);
  return res.json(updatedKpi);
});

app.delete("/kpis/:id", (req, res) => {
  const db = readDB();
  db.kpis = db.kpis.filter((kpi) => String(kpi.id) !== String(req.params.id));
  writeDB(db);
  res.json({ ok: true });
});

app.get("/notes", (_req, res) => {
  const db = readDB();
  res.json(db.notes);
});

app.post("/notes", (req, res) => {
  const db = readDB();
  const employee = String(req.body.employee || "").trim();
  const text = String(req.body.text || "").trim();

  if (!employee || !text) {
    return res.status(400).json({
      ok: false,
      message: "La nota necesita empleada y contenido"
    });
  }

  const newNote = {
    id: Date.now(),
    employee,
    text,
    createdAt: new Date().toISOString()
  };

  db.notes.unshift(newNote);
  writeDB(db);
  return res.status(201).json(newNote);
});

app.delete("/notes/:id", (req, res) => {
  const db = readDB();
  db.notes = db.notes.filter((note) => String(note.id) !== String(req.params.id));
  writeDB(db);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Dashboard disponible en http://localhost:${PORT}`);
});
