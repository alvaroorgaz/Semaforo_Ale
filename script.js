const API = "http://localhost:3000";
const SESSION_KEY = "instoreDashboardSession";
const EDIT_KPI_KEY = "instoreDashboardEditKpiId";
const EDIT_KPI_RETURN_KEY = "instoreDashboardEditKpiReturn";

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch (_error) {
    return null;
  }
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "/index.html";
    return null;
  }
  return session;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "/index.html";
}

function setEditingKpiId(id) {
  localStorage.setItem(EDIT_KPI_KEY, String(id));
}

function getEditingKpiId() {
  return localStorage.getItem(EDIT_KPI_KEY);
}

function clearEditingKpiId() {
  localStorage.removeItem(EDIT_KPI_KEY);
}

function setEditingReturnPath(path) {
  localStorage.setItem(EDIT_KPI_RETURN_KEY, path);
}

function getEditingReturnPath() {
  return localStorage.getItem(EDIT_KPI_RETURN_KEY) || "/semaforo.html";
}

function clearEditingReturnPath() {
  localStorage.removeItem(EDIT_KPI_RETURN_KEY);
}

function openKpiEditor(id, returnPath = "/semaforo.html") {
  setEditingKpiId(id);
  setEditingReturnPath(returnPath);
  window.location.href = `/editar-kpi.html?id=${id}`;
}

function getOwnerLabel(owner) {
  if (owner === "alex") {
    return "KPI de Alex";
  }

  if (owner === "eva") {
    return "KPI de Eva";
  }

  return "KPI conjunto";
}

function filterKpisByOwner(kpis, filter) {
  return kpis.filter((kpi) => (kpi.owner || "both") === filter);
}

function updateOwnerFieldState(ownerSelectId, alexandraInputId, evaInputId) {
  const owner = document.getElementById(ownerSelectId).value;
  const alexandraInput = document.getElementById(alexandraInputId);
  const evaInput = document.getElementById(evaInputId);

  alexandraInput.disabled = owner === "eva";
  evaInput.disabled = owner === "alex";

  if (owner === "eva") {
    alexandraInput.value = 0;
  }

  if (owner === "alex") {
    evaInput.value = 0;
  }
}

function formatValue(value, unit) {
  if (unit === "EUR") {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value);
  }

  if (unit === "%") {
    return `${value}%`;
  }

  return `${new Intl.NumberFormat("es-ES").format(value)} ${unit}`.trim();
}

function getStatus(value, target) {
  const ratio = target ? (value / target) * 100 : 0;

  if (ratio >= 80 && ratio <= 100) {
    return {
      label: "En verde",
      className: "status-green",
      color: "#1e9b62",
      progress: Math.min(ratio, 100)
    };
  }

  if (ratio >= 50 && ratio < 80) {
    return {
      label: "En naranja",
      className: "status-orange",
      color: "#ef8f16",
      progress: Math.min(ratio, 100)
    };
  }

  return {
    label: "En rojo",
    className: "status-red",
    color: "#d1495b",
    progress: Math.min(ratio, 100)
  };
}

async function fetchJSON(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "No se pudo completar la accion");
  }
  return response.json();
}

function renderNavUser() {
  const target = document.getElementById("navUser");
  if (target) {
    target.textContent = "";
  }
}

function renderWelcomeText() {
  const session = getSession();
  const target = document.getElementById("welcomeMessage");
  if (target && session) {
    target.textContent = `Bienvenida ${session.name}`;
  }
}

function createStatusBadge(status) {
  return `<span class="status-pill ${status.className}">${status.label}</span>`;
}

async function initLoginPage() {
  if (!document.getElementById("loginForm")) {
    return;
  }

  if (getSession()) {
    window.location.href = "/dashboard.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const submitButton = document.getElementById("loginButton");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const data = await fetchJSON("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      saveSession(data);
      window.location.href = "/dashboard.html";
    } catch (error) {
      errorBox.textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = "Acceder al dashboard";
    }
  });
}

async function initDashboardPage() {
  if (!document.getElementById("dashboardPage")) {
    return;
  }

  requireAuth();
  renderNavUser();
  renderWelcomeText();

  const [team, kpis, notes] = await Promise.all([
    fetchJSON("/team"),
    fetchJSON("/kpis"),
    fetchJSON("/notes")
  ]);

  renderSummaryCards(kpis);
  renderTeamHighlights(team, notes);
  renderDashboardTable(kpis);
  renderChart(kpis);
}

function renderSummaryCards(kpis) {
  const totalKpis = kpis.length;
  const greenCount = kpis.reduce((acc, kpi) => {
    return acc + (getStatus(kpi.alexandra, kpi.target).className === "status-green" ? 1 : 0);
  }, 0);

  const evaAverage = Math.round(
    kpis.reduce((acc, kpi) => acc + (kpi.eva / kpi.target) * 100, 0) / totalKpis
  );

  const target = document.getElementById("summaryCards");
  target.innerHTML = `
    <div class="col-md-4">
      <div class="metric-card h-100">
        <div class="metric-label mb-2">KPIs activos</div>
        <div class="metric-value">${totalKpis}</div>
        <p class="muted-text mb-0 mt-2">Base lista para meter mas indicadores cuando me pases los definitivos.</p>
      </div>
    </div>
    <div class="col-md-4">
      <div class="metric-card h-100">
        <div class="metric-label mb-2">Alexandra en verde</div>
        <div class="metric-value">${greenCount}</div>
        <p class="muted-text mb-0 mt-2">KPIs ya cumplidos o superados por Alexandra.</p>
      </div>
    </div>
    <div class="col-md-4">
      <div class="metric-card h-100">
        <div class="metric-label mb-2">Media Eva</div>
        <div class="metric-value">${evaAverage}%</div>
        <p class="muted-text mb-0 mt-2">Porcentaje medio respecto al objetivo actual.</p>
      </div>
    </div>
  `;
}

function renderTeamHighlights(team, notes) {
  const target = document.getElementById("teamHighlights");
  target.innerHTML = team
    .map((member) => {
      const memberNotes = notes.filter((note) => note.employee === member.name).slice(0, 1);
      const latestNote = memberNotes.length ? memberNotes[0].text : "Sin anotaciones todavia.";

      return `
        <div class="col-lg-6">
          <div class="employee-card">
            <div class="d-flex align-items-start gap-3">
              <div class="employee-icon"><i class="bi bi-person-badge"></i></div>
              <div>
                <h3 class="h5 mb-1">${member.name}</h3>
                <p class="muted-text mb-2">${member.role}</p>
                <p class="mb-2"><strong>Foco:</strong> ${member.focus}</p>
                <p class="mb-3"><strong>Fortalezas:</strong> ${member.strengths}</p>
                <div class="note-card p-3">
                  <div class="small text-uppercase muted-text fw-semibold mb-2">Ultima observacion</div>
                  <div>${latestNote}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderDashboardTable(kpis) {
  const target = document.getElementById("dashboardTable");
  target.innerHTML = kpis
    .map((kpi) => {
      const alexandraStatus = getStatus(kpi.alexandra, kpi.target);
      const evaStatus = getStatus(kpi.eva, kpi.target);

      return `
        <tr>
          <td>
            <div class="fw-semibold">${kpi.name}</div>
            <div class="small muted-text">${kpi.description}</div>
          </td>
          <td>${formatValue(kpi.target, kpi.unit)}</td>
          <td>
            ${createStatusBadge(alexandraStatus)}
            <div class="mt-2 fw-semibold">${formatValue(kpi.alexandra, kpi.unit)}</div>
          </td>
          <td>
            ${createStatusBadge(evaStatus)}
            <div class="mt-2 fw-semibold">${formatValue(kpi.eva, kpi.unit)}</div>
          </td>
        </tr>
      `;
    })
    .join("");
}

let dashboardChart;

function renderChart(kpis) {
  const canvas = document.getElementById("kpiChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  if (dashboardChart) {
    dashboardChart.destroy();
  }

  dashboardChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: kpis.map((kpi) => kpi.name),
      datasets: [
        {
          label: "Objetivo",
          data: kpis.map((kpi) => kpi.target),
          backgroundColor: "rgba(16, 37, 66, 0.15)",
          borderRadius: 12
        },
        {
          label: "Alexandra",
          data: kpis.map((kpi) => kpi.alexandra),
          backgroundColor: "#1f5eff",
          borderRadius: 12
        },
        {
          label: "Eva",
          data: kpis.map((kpi) => kpi.eva),
          backgroundColor: "#ef8f16",
          borderRadius: 12
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(16, 37, 66, 0.08)"
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

async function initSemaforoPage() {
  if (!document.getElementById("semaforoHomePage")) {
    return;
  }

  requireAuth();
  renderNavUser();
}

function renderOwnerKpiCards(kpis, owner, returnPath) {
  const target = document.getElementById("ownerKpiCards");
  target.innerHTML = kpis
    .map((kpi) => {
      const alexandraStatus = getStatus(kpi.alexandra, kpi.target);
      const evaStatus = getStatus(kpi.eva, kpi.target);
      const valueBlock =
        owner === "alex"
          ? `
            <div>
              <div class="d-flex justify-content-between mb-2">
                <span>Alex</span>
                <span>${formatValue(kpi.alexandra, kpi.unit)}</span>
              </div>
              ${createStatusBadge(alexandraStatus)}
              <div class="progress progress-soft mt-2">
                <div class="progress-bar" style="width:${alexandraStatus.progress}%; background:${alexandraStatus.color}"></div>
              </div>
            </div>
          `
          : owner === "eva"
            ? `
            <div>
              <div class="d-flex justify-content-between mb-2">
                <span>Eva</span>
                <span>${formatValue(kpi.eva, kpi.unit)}</span>
              </div>
              ${createStatusBadge(evaStatus)}
              <div class="progress progress-soft mt-2">
                <div class="progress-bar" style="width:${evaStatus.progress}%; background:${evaStatus.color}"></div>
              </div>
            </div>
          `
            : `
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-2">
                <span>Alex</span>
                <span>${formatValue(kpi.alexandra, kpi.unit)}</span>
              </div>
              ${createStatusBadge(alexandraStatus)}
              <div class="progress progress-soft mt-2">
                <div class="progress-bar" style="width:${alexandraStatus.progress}%; background:${alexandraStatus.color}"></div>
              </div>
            </div>
            <div>
              <div class="d-flex justify-content-between mb-2">
                <span>Eva</span>
                <span>${formatValue(kpi.eva, kpi.unit)}</span>
              </div>
              ${createStatusBadge(evaStatus)}
              <div class="progress progress-soft mt-2">
                <div class="progress-bar" style="width:${evaStatus.progress}%; background:${evaStatus.color}"></div>
              </div>
            </div>
          `;

      return `
        <div class="col-xl-6">
          <div class="kpi-card h-100">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h3 class="h5 mb-1">${kpi.name}</h3>
                <p class="muted-text mb-0">${kpi.description}</p>
                <div class="small text-uppercase muted-text fw-semibold mt-2">${getOwnerLabel(kpi.owner || "both")}</div>
              </div>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-soft" onclick="openKpiEditor(${kpi.id}, '${returnPath}')">Editar</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteKpi(${kpi.id})">Eliminar</button>
              </div>
            </div>
            <div class="mb-3"><strong>Objetivo:</strong> ${formatValue(kpi.target, kpi.unit)}</div>
            ${valueBlock}
          </div>
        </div>
      `;
    })
    .join("");

  if (!kpis.length) {
    target.innerHTML = `<div class="col-12"><div class="empty-state">Todavia no hay KPIs en esta seccion.</div></div>`;
  }
}

function renderOwnerKpiTable(kpis, owner, returnPath) {
  const target = document.getElementById("ownerKpiTable");
  target.innerHTML = kpis
    .map((kpi) => {
      const alexandraStatus = getStatus(kpi.alexandra, kpi.target);
      const evaStatus = getStatus(kpi.eva, kpi.target);

      if (owner === "alex") {
        return `
          <tr>
            <td>${kpi.name}</td>
            <td>${formatValue(kpi.target, kpi.unit)}</td>
            <td>${formatValue(kpi.alexandra, kpi.unit)}</td>
            <td>${createStatusBadge(alexandraStatus)}</td>
            <td><button type="button" class="btn btn-sm btn-outline-soft" onclick="openKpiEditor(${kpi.id}, '${returnPath}')">Editar</button></td>
          </tr>
        `;
      }

      if (owner === "eva") {
        return `
          <tr>
            <td>${kpi.name}</td>
            <td>${formatValue(kpi.target, kpi.unit)}</td>
            <td>${formatValue(kpi.eva, kpi.unit)}</td>
            <td>${createStatusBadge(evaStatus)}</td>
            <td><button type="button" class="btn btn-sm btn-outline-soft" onclick="openKpiEditor(${kpi.id}, '${returnPath}')">Editar</button></td>
          </tr>
        `;
      }

      return `
        <tr>
          <td>${kpi.name}</td>
          <td>${formatValue(kpi.target, kpi.unit)}</td>
          <td>${formatValue(kpi.alexandra, kpi.unit)}</td>
          <td>${createStatusBadge(alexandraStatus)}</td>
          <td>${formatValue(kpi.eva, kpi.unit)}</td>
          <td>${createStatusBadge(evaStatus)}</td>
          <td><button type="button" class="btn btn-sm btn-outline-soft" onclick="openKpiEditor(${kpi.id}, '${returnPath}')">Editar</button></td>
        </tr>
      `;
    })
    .join("");

  if (!kpis.length) {
    const colspan = owner === "both" ? 7 : 5;
    target.innerHTML = `<tr><td colspan="${colspan}" class="text-center muted-text py-4">Todavia no hay KPIs en esta seccion.</td></tr>`;
  }
}

async function loadOwnerKpiData(owner, returnPath) {
  const allKpis = await fetchJSON("/kpis");
  const kpis = filterKpisByOwner(allKpis, owner);
  renderOwnerKpiCards(kpis, owner, returnPath);
  renderOwnerKpiTable(kpis, owner, returnPath);
}

async function initKpiOwnerPage() {
  const page = document.getElementById("kpiOwnerPage");
  if (!page) {
    return;
  }

  requireAuth();
  renderNavUser();

  const owner = page.dataset.owner;
  const returnPath = window.location.pathname;
  await loadOwnerKpiData(owner, returnPath);

  const form = document.getElementById("ownerKpiForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: document.getElementById("ownerKpiName").value.trim(),
      description: document.getElementById("ownerKpiDescription").value.trim(),
      owner,
      target: Number(document.getElementById("ownerKpiTarget").value),
      unit: document.getElementById("ownerKpiUnit").value.trim(),
      alexandra: owner === "eva" ? 0 : Number(document.getElementById("ownerKpiAlexandra")?.value || 0),
      eva: owner === "alex" ? 0 : Number(document.getElementById("ownerKpiEva")?.value || 0)
    };

    await fetchJSON("/kpis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    form.reset();
    await loadOwnerKpiData(owner, returnPath);
  });
}

async function deleteKpi(id) {
  await fetchJSON(`/kpis/${id}`, { method: "DELETE" });
  await loadSemaforoData();
}

async function initNotasPage() {
  if (!document.getElementById("notasPage")) {
    return;
  }

  requireAuth();
  renderNavUser();

  const team = await fetchJSON("/team");
  const select = document.getElementById("employeeSelect");
  select.innerHTML = team
    .map((member) => `<option value="${member.name}">${member.name}</option>`)
    .join("");

  await loadNotes();

  document.getElementById("noteForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    await fetchJSON("/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee: select.value,
        text: document.getElementById("noteText").value.trim()
      })
    });

    event.target.reset();
    select.value = team[0].name;
    await loadNotes();
  });
}

async function loadNotes() {
  const notes = await fetchJSON("/notes");
  const list = document.getElementById("notesList");

  if (!notes.length) {
    list.innerHTML = `<div class="empty-state">Todavia no hay anotaciones guardadas.</div>`;
    return;
  }

  list.innerHTML = notes
    .map((note) => {
      const date = new Date(note.createdAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      return `
        <div class="note-card mb-3">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div class="small text-uppercase muted-text fw-semibold mb-2">${note.employee}</div>
              <p class="mb-2">${note.text}</p>
              <div class="small muted-text">${date}</div>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(${note.id})">Eliminar</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function deleteNote(id) {
  await fetchJSON(`/notes/${id}`, { method: "DELETE" });
  await loadNotes();
}

async function initEquipoPage() {
  if (!document.getElementById("equipoPage")) {
    return;
  }

  requireAuth();
  renderNavUser();

  const [team, notes, kpis] = await Promise.all([
    fetchJSON("/team"),
    fetchJSON("/notes"),
    fetchJSON("/kpis")
  ]);

  const container = document.getElementById("teamCards");
  container.innerHTML = team
    .map((member) => {
      const latestNotes = notes.filter((note) => note.employee === member.name).slice(0, 2);
      const relatedKpis = kpis.slice(0, 2);

      return `
        <div class="col-lg-6">
          <div class="employee-card">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="employee-icon"><i class="bi bi-stars"></i></div>
              <div>
                <h2 class="h4 mb-1">${member.name}</h2>
                <p class="muted-text mb-0">${member.role}</p>
              </div>
            </div>
            <p><strong>Foco actual:</strong> ${member.focus}</p>
            <p><strong>Punto fuerte:</strong> ${member.strengths}</p>
            <div class="mb-3">
              <div class="small text-uppercase muted-text fw-semibold mb-2">KPIs destacados</div>
              ${relatedKpis
                .map((kpi) => `<div class="mb-1">${kpi.name} · objetivo ${formatValue(kpi.target, kpi.unit)}</div>`)
                .join("")}
            </div>
            <div>
              <div class="small text-uppercase muted-text fw-semibold mb-2">Notas recientes</div>
              ${
                latestNotes.length
                  ? latestNotes.map((note) => `<div class="note-card mb-2">${note.text}</div>`).join("")
                  : `<div class="empty-state p-3">Sin notas recientes.</div>`
              }
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function renderEditKpiSummary(kpi) {
  const target = document.getElementById("editKpiSummary");
  if (!target) {
    return;
  }

  const alexandraStatus = getStatus(kpi.alexandra, kpi.target);
  const evaStatus = getStatus(kpi.eva, kpi.target);

  target.className = "";
  target.innerHTML = `
    <div class="small text-uppercase muted-text fw-semibold mb-2">KPI seleccionado</div>
    <h3 class="h5 mb-3">${kpi.name}</h3>
    <p class="mb-2"><strong>Tipo:</strong> ${getOwnerLabel(kpi.owner || "both")}</p>
    <p class="mb-2"><strong>Descripcion:</strong> ${kpi.description || "Sin descripcion"}</p>
    <p class="mb-3"><strong>Objetivo:</strong> ${formatValue(kpi.target, kpi.unit)}</p>
    <div class="mb-3">
      <div class="fw-semibold mb-1">Alexandra</div>
      ${createStatusBadge(alexandraStatus)}
      <div class="mt-2">${formatValue(kpi.alexandra, kpi.unit)}</div>
    </div>
    <div>
      <div class="fw-semibold mb-1">Eva</div>
      ${createStatusBadge(evaStatus)}
      <div class="mt-2">${formatValue(kpi.eva, kpi.unit)}</div>
    </div>
  `;
}

async function initEditarKpiPage() {
  if (!document.getElementById("editarKpiPage")) {
    return;
  }

  requireAuth();
  renderNavUser();

  const kpiId = getQueryParam("id") || getEditingKpiId();
  if (!kpiId) {
    throw new Error("No se ha indicado que KPI quieres editar");
  }

  setEditingKpiId(kpiId);
  const kpis = await fetchJSON("/kpis");
  const kpi = kpis.find((item) => String(item.id) === String(kpiId));

  if (!kpi) {
    throw new Error("No se ha encontrado el KPI seleccionado");
  }

  document.getElementById("editKpiName").value = kpi.name;
  document.getElementById("editKpiDescription").value = kpi.description || "";
  document.getElementById("editKpiOwner").value = kpi.owner || "both";
  document.getElementById("editKpiTarget").value = kpi.target;
  document.getElementById("editKpiUnit").value = kpi.unit;
  document.getElementById("editKpiAlexandra").value = kpi.alexandra;
  document.getElementById("editKpiEva").value = kpi.eva;
  updateOwnerFieldState("editKpiOwner", "editKpiAlexandra", "editKpiEva");
  renderEditKpiSummary(kpi);

  document.getElementById("editKpiOwner").addEventListener("change", () => {
    updateOwnerFieldState("editKpiOwner", "editKpiAlexandra", "editKpiEva");
  });

  document.getElementById("editKpiForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveButton = document.getElementById("saveKpiButton");
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";

    const payload = {
      id: Number(kpiId),
      name: document.getElementById("editKpiName").value.trim(),
      description: document.getElementById("editKpiDescription").value.trim(),
      owner: document.getElementById("editKpiOwner").value,
      target: Number(document.getElementById("editKpiTarget").value),
      unit: document.getElementById("editKpiUnit").value.trim(),
      alexandra: Number(document.getElementById("editKpiAlexandra").value),
      eva: Number(document.getElementById("editKpiEva").value)
    };

    try {
      const returnPath = getEditingReturnPath();
      await fetchJSON(`/kpis/${kpiId}`, {
        method: "DELETE"
      });

      const updatedKpi = await fetchJSON("/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      renderEditKpiSummary(updatedKpi);
      clearEditingKpiId();
      clearEditingReturnPath();
      window.location.href = returnPath;
    } catch (error) {
      saveButton.disabled = false;
      saveButton.textContent = "Guardar cambios";
      throw error;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initLoginPage();
    await initDashboardPage();
    await initSemaforoPage();
    await initKpiOwnerPage();
    await initNotasPage();
    await initEquipoPage();
    await initEditarKpiPage();
  } catch (error) {
    const errorBox = document.getElementById("pageError");
    if (errorBox) {
      errorBox.textContent = error.message;
      errorBox.classList.remove("d-none");
    }
  }
});
