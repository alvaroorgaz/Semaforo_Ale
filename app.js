const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "db.json");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readDB() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function parseMetricNumber(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return NaN;
  }

  const clean = text
    .replace(/€/g, "")
    .replace(/%/g, "")
    .replace(/\+/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const number = Number.parseFloat(clean);
  return Number.isNaN(number) ? NaN : number;
}

function sanitizeKpi(payload) {
  return {
    id: payload.id || Date.now(),
    name: String(payload.name || "").trim(),
    description: String(payload.description || "").trim(),
    formula: String(payload.formula || "").trim(),
    owner: String(payload.owner || "both").trim(),
    minTarget: String(payload.minTarget || "").trim(),
    target: String(payload.target || "").trim(),
    unit: String(payload.unit || "").trim(),
    alexandra: String(payload.alexandra ?? "0").trim(),
    eva: String(payload.eva ?? "0").trim()
  };
}

function mapKpiFromSupabase(kpi) {
  return {
    id: kpi.id,
    name: kpi.name || "",
    description: kpi.description || "",
    formula: kpi.formula || "",
    owner: kpi.owner || "both",
    minTarget: kpi.min_target || "",
    target: kpi.target || "",
    unit: kpi.unit || "",
    alexandra: kpi.alexandra || "0",
    eva: kpi.eva || "0"
  };
}

function mapKpiToSupabase(kpi) {
  return {
    id: Number(kpi.id),
    name: kpi.name,
    description: kpi.description,
    formula: kpi.formula,
    owner: kpi.owner,
    min_target: kpi.minTarget,
    target: kpi.target,
    unit: kpi.unit,
    alexandra: kpi.alexandra,
    eva: kpi.eva
  };
}

function mapNoteFromSupabase(note) {
  return {
    id: note.id,
    employee: note.employee || "",
    text: note.text || "",
    createdAt: note.created_at
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

app.get("/kpis", async (_req, res) => {
  const { data, error } = await supabase
    .from("kpis")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.json((data || []).map(mapKpiFromSupabase));
});

app.post("/kpis", async (req, res) => {
  const newKpi = sanitizeKpi(req.body);

  if (
    !newKpi.name ||
    Number.isNaN(parseMetricNumber(newKpi.target)) ||
    Number.isNaN(parseMetricNumber(newKpi.alexandra)) ||
    Number.isNaN(parseMetricNumber(newKpi.eva))
  ) {
    return res.status(400).json({
      ok: false,
      message: "Faltan datos obligatorios del KPI"
    });
  }

  const { data, error } = await supabase
    .from("kpis")
    .insert(mapKpiToSupabase(newKpi))
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.status(201).json(mapKpiFromSupabase(data));
});

app.get("/kpis/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("kpis")
    .select("*")
    .eq("id", Number(req.params.id))
    .single();

  if (error || !data) {
    return res.status(404).json({
      ok: false,
      message: "KPI no encontrado"
    });
  }

  return res.json(mapKpiFromSupabase(data));
});

app.put("/kpis/:id", async (req, res) => {
  const updatedKpi = sanitizeKpi({
    ...req.body,
    id: Number(req.params.id)
  });

  if (
    !updatedKpi.name ||
    Number.isNaN(parseMetricNumber(updatedKpi.target)) ||
    Number.isNaN(parseMetricNumber(updatedKpi.alexandra)) ||
    Number.isNaN(parseMetricNumber(updatedKpi.eva))
  ) {
    return res.status(400).json({
      ok: false,
      message: "Faltan datos obligatorios del KPI"
    });
  }

  const { data, error } = await supabase
    .from("kpis")
    .update(mapKpiToSupabase(updatedKpi))
    .eq("id", Number(req.params.id))
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.json(mapKpiFromSupabase(data));
});

app.delete("/kpis/:id", async (req, res) => {
  const { error } = await supabase
    .from("kpis")
    .delete()
    .eq("id", Number(req.params.id));

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.json({ ok: true });
});

app.get("/notes", async (_req, res) => {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.json((data || []).map(mapNoteFromSupabase));
});

app.post("/notes", async (req, res) => {
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
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("notes")
    .insert(newNote)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.status(201).json(mapNoteFromSupabase(data));
});

app.delete("/notes/:id", async (req, res) => {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", Number(req.params.id));

  if (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Dashboard disponible en http://localhost:${PORT}`);
});