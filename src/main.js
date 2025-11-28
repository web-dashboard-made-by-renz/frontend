import Chart from "chart.js/auto";
import { requireAuth, getToken, logout } from "./auth.js";

const API = "https://asia-southeast2-renzip-478811.cloudfunctions.net/dashboard/api/v1";
const DEFAULT_LIMIT = 10;

// Helper function to add Authorization header
function getAuthHeaders() {
  const token = getToken();
  return {
    "Authorization": `Bearer ${token}`,
  };
}

// ------------------------- GLOBAL STATE -------------------------
let dailyChart = null;
let accChart = null;
let top10Chart = null;
let trainingData = [];
let colorisData = [];
let selloutData = [];
let showAllTraining = false;
let showAllColoris = false;
let showAllSellout = false;

const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const modalAction = document.getElementById("modalAction");
const modalCancel = document.getElementById("modalCancel");
const dataTypeSelect = document.getElementById("dataTypeSelect");

let currentAction = null; // "import" | "export" | "manual"

function formatCurrency(value) {
  if (value == null) return "";
  return Number(value).toLocaleString("id-ID");
}

function formatFloat(value) {
  if (value == null || isNaN(value)) return "";
  return Number(value).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString("id-ID");
}

function updateToggleButton(btnId, isShowingAll, totalRows) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (totalRows <= DEFAULT_LIMIT) {
    btn.style.display = "none";
    return;
  }
  btn.style.display = "inline-flex";
  btn.textContent = isShowingAll ? "Tampilkan Top 10" : "Tampilkan Semua";
}

function renderTrainingTable() {
  const table = document.getElementById("trainingTable");
  const tbody = table ? table.querySelector("tbody") : null;

  if (!tbody) {
    console.error("tbody trainingTable tidak ditemukan");
    return;
  }

  if (!trainingData.length) {
    tbody.innerHTML = `<tr><td colspan="5">Tidak ada data Training</td></tr>`;
    updateToggleButton("trainingToggle", showAllTraining, trainingData.length);
    return;
  }

  const rows = showAllTraining ? trainingData : trainingData.slice(0, DEFAULT_LIMIT);
  tbody.innerHTML = "";

  rows.forEach((row) => {
    tbody.innerHTML += `
      <tr>
        <td>${row.timestamp ? new Date(row.timestamp).toLocaleDateString() : ""}</td>
        <td>${row.cabang_area || ""}</td>
        <td>${row.nama_lengkap_sesuai_ktp || ""}</td>
        <td>${row.materi_pelatihan || ""}</td>
        <td>${row.total_nilai ?? ""}</td>
      </tr>
    `;
  });

  updateToggleButton("trainingToggle", showAllTraining, trainingData.length);
}

function renderColorisTable() {
  const table = document.getElementById("colorisTable");
  const tbody = table ? table.querySelector("tbody") : null;

  if (!tbody) {
    console.error("tbody colorisTable tidak ditemukan");
    return;
  }

  if (!colorisData.length) {
    tbody.innerHTML = `<tr><td colspan="5">Tidak ada data Coloris</td></tr>`;
    updateToggleButton("colorisToggle", showAllColoris, colorisData.length);
    return;
  }

  const rows = showAllColoris ? colorisData : colorisData.slice(0, DEFAULT_LIMIT);
  tbody.innerHTML = "";

  rows.forEach((row) => {
    tbody.innerHTML += `
      <tr>
        <td>${row.timestamp ? new Date(row.timestamp).toLocaleDateString() : ""}</td>
        <td>${row.nama_lengkap_sesuai_ktp || ""}</td>
        <td>${row.region || ""}</td>
        <td>${row.materi || ""}</td>
        <td>${row.nilai_akhir ?? ""}</td>
      </tr>
    `;
  });

  updateToggleButton("colorisToggle", showAllColoris, colorisData.length);
}

function renderSelloutTable() {
  const table = document.getElementById("selloutTable");
  const tbody = table ? table.querySelector("tbody") : null;

  if (!tbody) {
    console.error("tbody selloutTable tidak ditemukan");
    return;
  }

  if (!selloutData.length) {
    tbody.innerHTML = `<tr><td colspan="18">Tidak ada data Sellout</td></tr>`;
    updateToggleButton("selloutToggle", showAllSellout, selloutData.length);
    return;
  }

  const rows = showAllSellout ? selloutData : selloutData.slice(0, DEFAULT_LIMIT);
  tbody.innerHTML = "";

  rows.forEach((row) => {
    tbody.innerHTML += `
      <tr>
        <td>${row.tahun ?? ""}</td>
        <td>${row.bulan ?? ""}</td>
        <td>${row.reg || ""}</td>
        <td>${row.cabang || ""}</td>
        <td>${row.outlet || ""}</td>
        <td>${row.area_cover || ""}</td>
        <td>${row.mos_ss || ""}</td>
        <td>${row.nama_colorist || ""}</td>
        <td>${row.no_reg || ""}</td>
        <td>${formatDate(row.tanggal_bergabung)}</td>
        <td>${formatFloat(row.masa_kerja)}</td>
        <td>${row.sellout_tt != null ? row.sellout_tt.toLocaleString("id-ID") : ""}</td>
        <td>${row.sellout_rm != null ? row.sellout_rm.toLocaleString("id-ID") : ""}</td>
        <td>${formatCurrency(row.primafix)}</td>
        <td>${formatCurrency(row.target_sellout)}</td>
        <td>${row.chl || ""}</td>
        <td>${row.wilayah || ""}</td>
        <td>${row.total_sellout != null ? row.total_sellout.toLocaleString("id-ID") : ""}</td>
      </tr>
    `;
  });

  updateToggleButton("selloutToggle", showAllSellout, selloutData.length);
}

// ------------------------- TABLE LOADERS -------------------------
async function loadTraining() {
  try {
    const res = await fetch(`${API}/training?per_page=50&page=1`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      console.error("training fetch failed:", res.status, res.statusText);
      const table = document.getElementById("trainingTable");
      const tbody = table ? table.querySelector("tbody") : null;
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${res.status} ${res.statusText}</td></tr>`;
      }
      return;
    }

    const response = await res.json();
    console.log("training response:", response);

    const table = document.getElementById("trainingTable");
    const tbody = table ? table.querySelector("tbody") : null;

    if (!tbody) {
      console.error("tbody trainingTable tidak ditemukan");
      return;
    }

    if (response.error) {
      console.error("Response has error:", response.error);
      tbody.innerHTML = `<tr><td colspan="5">Error: ${response.error}</td></tr>`;
      return;
    }

    if (!response.data || !Array.isArray(response.data)) {
      console.error("Response training tidak memiliki array data:", response);
      tbody.innerHTML = `<tr><td colspan="5">Format response tidak sesuai</td></tr>`;
      return;
    }

    if (response.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">Tidak ada data Training</td></tr>`;
      trainingData = [];
      updateToggleButton("trainingToggle", showAllTraining, trainingData.length);
      return;
    }

    trainingData = response.data;
    showAllTraining = false;
    renderTrainingTable();
  } catch (err) {
    console.error("Error load training:", err);
    const table = document.getElementById("trainingTable");
    const tbody = table ? table.querySelector("tbody") : null;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${err.message}</td></tr>`;
      trainingData = [];
      updateToggleButton("trainingToggle", showAllTraining, trainingData.length);
    }
  }
}

async function loadColoris() {
  try {
    const res = await fetch(`${API}/coloris?per_page=50&page=1`, {
      headers: getAuthHeaders(),
    });
    console.log("coloris status:", res.status);

    if (!res.ok) {
      console.error("coloris fetch failed:", res.status, res.statusText);
      const table = document.getElementById("colorisTable");
      const tbody = table ? table.querySelector("tbody") : null;
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${res.status} ${res.statusText}</td></tr>`;
      }
      return;
    }

    const response = await res.json();
    console.log("coloris response:", response);

    const table = document.getElementById("colorisTable");
    const tbody = table ? table.querySelector("tbody") : null;

    if (!tbody) {
      console.error("tbody colorisTable tidak ditemukan");
      return;
    }

    // Check if response has error field
    if (response.error) {
      console.error("Response has error:", response.error);
      tbody.innerHTML = `<tr><td colspan="5">Error: ${response.error}</td></tr>`;
      return;
    }

    // Check if response has data array
    if (!response.data || !Array.isArray(response.data)) {
      console.error("Response coloris tidak memiliki array data:", response);
      tbody.innerHTML = `<tr><td colspan="5">Format response tidak sesuai. Expected: {data: [], total: number}</td></tr>`;
      return;
    }

    if (response.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">Tidak ada data Coloris</td></tr>`;
      colorisData = [];
      updateToggleButton("colorisToggle", showAllColoris, colorisData.length);
      return;
    }

    colorisData = response.data;
    showAllColoris = false;
    renderColorisTable();
  } catch (err) {
    console.error("Error load coloris:", err);
    const table = document.getElementById("colorisTable");
    const tbody = table ? table.querySelector("tbody") : null;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${err.message}</td></tr>`;
      colorisData = [];
      updateToggleButton("colorisToggle", showAllColoris, colorisData.length);
    }
  }
}



async function loadSelloutAndCharts() {
  try {
    const res = await fetch(`${API}/sellout?per_page=200&page=1`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      console.error("sellout fetch failed:", res.status, res.statusText);
      const table = document.getElementById("selloutTable");
      const tbody = table ? table.querySelector("tbody") : null;
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="18">Error: ${res.status} ${res.statusText}</td></tr>`;
      }
      return;
    }

    const response = await res.json();
    console.log("sellout response:", response);

    const table = document.getElementById("selloutTable");
    const tbody = table ? table.querySelector("tbody") : null;

    if (!tbody) {
      console.error("tbody selloutTable tidak ditemukan");
      return;
    }

    if (response.error) {
      console.error("Response has error:", response.error);
      tbody.innerHTML = `<tr><td colspan="9">Error: ${response.error}</td></tr>`;
      return;
    }

    if (!response.data || !Array.isArray(response.data)) {
      console.error("Response sellout tidak memiliki array data:", response);
      tbody.innerHTML = `<tr><td colspan="18">Format response tidak sesuai</td></tr>`;
      return;
    }

    if (response.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="18">Tidak ada data Sellout</td></tr>`;
      selloutData = [];
      updateToggleButton("selloutToggle", showAllSellout, selloutData.length);
      return;
    }

    selloutData = response.data;
    showAllSellout = false;
    renderSelloutTable();
    buildChartsFromSellout(selloutData);
  } catch (err) {
    console.error("Error load sellout:", err);
    const table = document.getElementById("selloutTable");
    const tbody = table ? table.querySelector("tbody") : null;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="18">Error: ${err.message}</td></tr>`;
      selloutData = [];
      updateToggleButton("selloutToggle", showAllSellout, selloutData.length);
    }
  }
}

function loadAllData() {
  loadTraining();
  loadColoris();
  loadSelloutAndCharts();
}

// ------------------------- CHARTS -------------------------
function destroyChart(c) {
  if (c) c.destroy();
}

function buildChartsFromSellout(sellouts) {
  if (!sellouts || sellouts.length === 0) {
    return;
  }

  // Sort by tahun, bulan (kalau sama pakai id)
  const sorted = [...sellouts].sort((a, b) => {
    if (a.tahun !== b.tahun) return (a.tahun || 0) - (b.tahun || 0);
    if (a.bulan !== b.bulan) return (a.bulan || 0) - (b.bulan || 0);
    return (a.id || 0) - (b.id || 0);
  });

  const limited = sorted.slice(0, 25);
  const labels = limited.map((_, idx) => `${idx + 1}`);

  const soDaily = limited.map((r) => r.total_sellout || 0);
  const soJT = limited.map((r) => r.sellout_tt || 0);
  const sj = limited.map((r) => r.sellout_rm || 0);
  const tagihan = limited.map((r) => (r.total_sellout || 0) * 0.8);
  const target = limited.map((r) => (r.total_sellout || 0) * 1.1);

  let cumSo = 0;
  let cumFakturNow = 0;
  let cumRetur = 0;
  let cumPso = 0;
  let cumLangsung = 0;

  const lineCumSo = [];
  const lineFakturNow = [];
  const lineRetur = [];
  const linePso = [];
  const lineLangsung = [];

  limited.forEach((r) => {
    const total = r.total_sellout || 0;
    const tt = r.sellout_tt || 0;
    const rm = r.sellout_rm || 0;

    cumSo += total;
    cumFakturNow += tt;
    cumRetur += rm * 0.05;
    cumPso += total * 0.03;
    cumLangsung += total * 0.1;

    lineCumSo.push(cumSo);
    lineFakturNow.push(cumFakturNow);
    lineRetur.push(cumRetur);
    linePso.push(cumPso);
    lineLangsung.push(cumLangsung);
  });

  // top 10 donut by total_sellout
  const top = [...sellouts]
    .filter((r) => (r.total_sellout || 0) > 0)
    .sort((a, b) => (b.total_sellout || 0) - (a.total_sellout || 0))
    .slice(0, 10);

  const topLabels = top.map((r) => r.nama_colorist || "Unknown");
  const topValues = top.map((r) => r.total_sellout || 0);

  // destroy old charts
  destroyChart(dailyChart);
  destroyChart(accChart);
  destroyChart(top10Chart);

  const dailyCtx = document.getElementById("chartDaily");
  const accCtx = document.getElementById("chartAcc");
  const topCtx = document.getElementById("chartTop10");

  dailyChart = new Chart(dailyCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "SO Daily MTD",
          data: soDaily,
          borderColor: "#2563eb",
          tension: 0.3,
        },
        {
          label: "SO JT",
          data: soJT,
          borderColor: "#fb923c",
          tension: 0.3,
        },
        {
          label: "SJ",
          data: sj,
          borderColor: "#10b981",
          tension: 0.3,
        },
        {
          label: "Tagihan",
          data: tagihan,
          borderColor: "#8b5cf6",
          tension: 0.3,
        },
        {
          label: "Target",
          data: target,
          borderColor: "#ef4444",
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e5e7eb", boxWidth: 10 } } },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(55,65,81,0.5)" } },
        y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(55,65,81,0.5)" } },
      },
    },
  });

  accChart = new Chart(accCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "SO Last + SO JT",
          data: lineCumSo,
          borderColor: "#38bdf8",
          tension: 0.3,
        },
        {
          label: "Faktur now + Faktur Last",
          data: lineFakturNow,
          borderColor: "#22c55e",
          tension: 0.3,
        },
        {
          label: "Retur",
          data: lineRetur,
          borderColor: "#f97316",
          tension: 0.3,
        },
        {
          label: "PSO",
          data: linePso,
          borderColor: "#eab308",
          tension: 0.3,
        },
        {
          label: "Faktur Langsung",
          data: lineLangsung,
          borderColor: "#ec4899",
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e5e7eb", boxWidth: 10 } } },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(55,65,81,0.5)" } },
        y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(55,65,81,0.5)" } },
      },
    },
  });

  top10Chart = new Chart(topCtx, {
    type: "doughnut",
    data: {
      labels: topLabels,
      datasets: [
        {
          data: topValues,
          backgroundColor: [
            "#2563eb",
            "#0ea5e9",
            "#fb923c",
            "#facc15",
            "#10b981",
            "#8b5cf6",
            "#ec4899",
            "#ef4444",
            "#22c55e",
            "#64748b",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "right", labels: { color: "#e5e7eb", boxWidth: 12 } },
      },
    },
  });
}

// ------------------------- MODAL HELPERS -------------------------
function buildManualForm(type) {
  if (type === "training") {
    return `
      <div class="form-grid">
        <div class="form-item">
          <span class="field-label">Timestamp</span>
          <input class="input-datetime" type="datetime-local" name="timestamp" required />
        </div>
        <div class="form-item">
          <span class="field-label">Bulan</span>
          <input class="input" name="bulan" placeholder="Januari" required />
        </div>
        <div class="form-item">
          <span class="field-label">Region</span>
          <input class="input" name="region" required />
        </div>
        <div class="form-item">
          <span class="field-label">Cabang/Area</span>
          <input class="input" name="cabang_area" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nama Atasan Langsung</span>
          <input class="input" name="nama_atasan_langsung" required />
        </div>
        <div class="form-item">
          <span class="field-label">Materi Pelatihan</span>
          <input class="input" name="materi_pelatihan" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nama Lengkap Sesuai KTP</span>
          <input class="input" name="nama_lengkap_sesuai_ktp" required />
        </div>
        <div class="form-item">
          <span class="field-label">Jabatan</span>
          <input class="input" name="jabatan" required />
        </div>
        <div class="form-item">
          <span class="field-label">Total Nilai (90/100 atau 90)</span>
          <input class="input" type="text" name="total_nilai" placeholder="90/100" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nilai Essay</span>
          <input class="input-number" type="number" step="0.01" name="nilai_essay" required />
        </div>
        <div class="form-item">
          <span class="field-label">Total</span>
          <input class="input-number" type="number" step="0.01" name="total" required />
        </div>
      </div>
    `;
  }

  if (type === "coloris") {
    return `
      <div class="form-grid">
        <div class="form-item">
          <span class="field-label">Timestamp</span>
          <input class="input-datetime" type="datetime-local" name="timestamp" required />
        </div>
        <div class="form-item">
          <span class="field-label">Bulan</span>
          <input class="input" name="bulan" required />
        </div>
        <div class="form-item">
          <span class="field-label">Region</span>
          <input class="input" name="region" required />
        </div>
        <div class="form-item">
          <span class="field-label">Cabang</span>
          <input class="input" name="cabang" required />
        </div>
        <div class="form-item">
          <span class="field-label">Materi</span>
          <input class="input" name="materi" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nama Atasan Langsung</span>
          <input class="input" name="nama_atasan_langsung" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nama Toko</span>
          <input class="input" name="nama_toko" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nama Lengkap Sesuai KTP</span>
          <input class="input" name="nama_lengkap_sesuai_ktp" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nilai PG (format: 80/100 atau 80)</span>
          <input class="input" type="text" name="nilai_pg" placeholder="80/100" required />
        </div>
        <div class="form-item">
          <span class="field-label">Nilai Akhir</span>
          <input class="input-number" type="number" step="0.01" name="nilai_akhir" required />
        </div>
        <div class="form-item">
          <span class="field-label">Total</span>
          <input class="input-number" type="number" step="0.01" name="total" required />
        </div>
      </div>
    `;
  }

  // sellout
  return `
    <div class="form-grid">
      <div class="form-item">
        <span class="field-label">Tahun (2024)</span>
        <input class="input-number" type="number" name="tahun" placeholder="2024" required />
      </div>
      <div class="form-item">
        <span class="field-label">Bulan (1-12)</span>
        <input class="input-number" type="number" name="bulan" min="1" max="12" placeholder="1" required />
      </div>
      <div class="form-item">
        <span class="field-label">Reg</span>
        <input class="input" name="reg" required />
      </div>
      <div class="form-item">
        <span class="field-label">Cabang</span>
        <input class="input" name="cabang" required />
      </div>
      <div class="form-item">
        <span class="field-label">Outlet</span>
        <input class="input" name="outlet" required />
      </div>
      <div class="form-item">
        <span class="field-label">Nama Colorist</span>
        <input class="input" name="nama_colorist" required />
      </div>
      <div class="form-item">
        <span class="field-label">No Reg</span>
        <input class="input" name="no_reg" required />
      </div>
      <div class="form-item">
        <span class="field-label">CHL</span>
        <input class="input" name="chl" required />
      </div>
      <div class="form-item">
        <span class="field-label">Sellout TT</span>
        <input class="input-number" type="number" step="0.01" name="sellout_tt" placeholder="4411000" required />
      </div>
      <div class="form-item">
        <span class="field-label">Sellout RM</span>
        <input class="input-number" type="number" step="0.01" name="sellout_rm" placeholder="2200000" required />
      </div>
      <div class="form-item">
        <span class="field-label">Total Sellout</span>
        <input class="input-number" type="number" step="0.01" name="total_sellout" placeholder="6611000" required />
      </div>
    </div>
  `;
}

// ------------------------- MODAL OPEN/CLOSE -------------------------
function openModal(action) {
  currentAction = action;
  overlay.classList.remove("hidden");
  const type = dataTypeSelect.value;

  if (action === "import") {
    modalTitle.textContent = "Import Excel";
    modalContent.innerHTML = `
      <span class="field-label">File Excel</span>
      <input id="fileInput" type="file" accept=".xlsx,.xls" />
    `;
    modalAction.textContent = "Import";
  } else if (action === "export") {
    modalTitle.textContent = "Export Excel";
    modalContent.innerHTML = `<p style="font-size:13px;">Klik <b>Lanjut</b> untuk download file Excel berdasarkan jenis data yang dipilih.</p>`;
    modalAction.textContent = "Download";
  } else if (action === "manual") {
    modalTitle.textContent = "Input Manual";
    modalContent.innerHTML = `
      <form id="manualForm">
        ${buildManualForm(type)}
      </form>
    `;
    modalAction.textContent = "Simpan";
  }
}

modalCancel.addEventListener("click", () => {
  overlay.classList.add("hidden");
});

// update form jika dropdown jenis data berubah pada mode manual
dataTypeSelect.addEventListener("change", () => {
  if (currentAction === "manual") {
    const type = dataTypeSelect.value;
    modalContent.innerHTML = `<form id="manualForm">${buildManualForm(type)}</form>`;
  }
});

// ------------------------- MODAL ACTION -------------------------
modalAction.addEventListener("click", async () => {
  const type = dataTypeSelect.value;

  if (currentAction === "import") {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput?.files?.[0];
    if (!file) {
      alert("Pilih file dulu");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API}/${type}/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`Import gagal: ${data.error || 'Unknown error'}`);
        return;
      }

      alert(`Import berhasil! ${data.count || 0} data berhasil diimport`);
      overlay.classList.add("hidden");
      loadAllData();
    } catch (err) {
      alert(`Import gagal: ${err.message}`);
      console.error("Import error:", err);
    }
    return;
  }

  if (currentAction === "export") {
    const token = getToken();
    window.open(`${API}/${type}/export?token=${token}`, "_blank");
    overlay.classList.add("hidden");
    return;
  }

  if (currentAction === "manual") {
    const form = document.getElementById("manualForm");
    const fd = new FormData(form);
    let payload = {};

    if (type === "training") {
      const ts = fd.get("timestamp");
      const totalNilaiStr = fd.get("total_nilai") || "0";

      // Parse total_nilai: if format is "90/100", extract 90
      let totalNilai = 0;
      if (totalNilaiStr.includes("/")) {
        const parts = totalNilaiStr.split("/");
        totalNilai = parseFloat(parts[0].trim()) || 0;
      } else {
        totalNilai = parseFloat(totalNilaiStr) || 0;
      }

      payload = {
        timestamp: ts ? new Date(ts).toISOString() : null,
        bulan: fd.get("bulan") || "",
        region: fd.get("region") || "",
        cabang_area: fd.get("cabang_area") || "",
        nama_atasan_langsung: fd.get("nama_atasan_langsung") || "",
        materi_pelatihan: fd.get("materi_pelatihan") || "",
        nama_lengkap_sesuai_ktp: fd.get("nama_lengkap_sesuai_ktp") || "",
        jabatan: fd.get("jabatan") || "",
        total_nilai: totalNilai,
        nilai_essay: parseFloat(fd.get("nilai_essay") || "0"),
        total: parseFloat(fd.get("total") || "0"),
      };
    } else if (type === "coloris") {
      const ts = fd.get("timestamp");
      const nilaiPGStr = fd.get("nilai_pg") || "0";

      // Parse nilai_pg: if format is "80/100", extract 80
      let nilaiPG = 0;
      if (nilaiPGStr.includes("/")) {
        const parts = nilaiPGStr.split("/");
        nilaiPG = parseFloat(parts[0].trim()) || 0;
      } else {
        nilaiPG = parseFloat(nilaiPGStr) || 0;
      }

      payload = {
        timestamp: ts ? new Date(ts).toISOString() : null,
        bulan: fd.get("bulan") || "",
        region: fd.get("region") || "",
        cabang: fd.get("cabang") || "",
        materi: fd.get("materi") || "",
        nama_atasan_langsung: fd.get("nama_atasan_langsung") || "",
        nama_toko: fd.get("nama_toko") || "",
        nama_lengkap_sesuai_ktp: fd.get("nama_lengkap_sesuai_ktp") || "",
        nilai_pg: nilaiPG,
        nilai_akhir: parseFloat(fd.get("nilai_akhir") || "0"),
        total: parseFloat(fd.get("total") || "0"),
      };
    } else {
      // sellout
      payload = {
        tahun: parseInt(fd.get("tahun") || "0", 10),
        bulan: parseInt(fd.get("bulan") || "0", 10),
        reg: fd.get("reg") || "",
        cabang: fd.get("cabang") || "",
        outlet: fd.get("outlet") || "",
        nama_colorist: fd.get("nama_colorist") || "",
        no_reg: fd.get("no_reg") || "",
        chl: fd.get("chl") || "",
        sellout_tt: parseFloat(fd.get("sellout_tt") || "0"),
        sellout_rm: parseFloat(fd.get("sellout_rm") || "0"),
        total_sellout: parseFloat(fd.get("total_sellout") || "0"),
      };
    }

    const res = await fetch(`${API}/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) alert("Simpan data gagal");
    else alert("Data berhasil disimpan");

    overlay.classList.add("hidden");
    loadAllData();
  }
});

// ------------------------- SIDEBAR BUTTONS -------------------------
document.querySelectorAll(".menu button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "dashboard") {
      document.getElementById("dashboardView").scrollIntoView({ behavior: "smooth" });
      return;
    }
    openModal(action);
  });
});

// Logout button
document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("Apakah Anda yakin ingin logout?")) {
    logout();
  }
});

// Toggle top 10 / semua data untuk tabel
document.getElementById("trainingToggle")?.addEventListener("click", () => {
  if (!trainingData.length) return;
  showAllTraining = !showAllTraining;
  renderTrainingTable();
});

document.getElementById("colorisToggle")?.addEventListener("click", () => {
  if (!colorisData.length) return;
  showAllColoris = !showAllColoris;
  renderColorisTable();
});

document.getElementById("selloutToggle")?.addEventListener("click", () => {
  if (!selloutData.length) return;
  showAllSellout = !showAllSellout;
  renderSelloutTable();
});

// ------------------------- INIT -------------------------
// Check authentication before loading data
requireAuth().then(() => {
  loadAllData();
});
