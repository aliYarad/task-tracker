let mockDatabase = {
  tugas: [
    { id: 1, judul: "Membuat Layout Responsive", matkulId: 1, deadline: "2026-10-20", status: "In Progress" },
    { id: 2, judul: "Menyusun Laporan Praktikum", matkulId: 2, deadline: "2026-10-25", status: "Not Started" }
  ],
  matkul: [
    { id: 1, nama: "Pemrograman Web" },
    { id: 2, nama: "Interaksi Manusia & Komputer" },
    { id: 3, nama: "Struktur Data" }
  ]
};

const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  await new Promise(resolve => setTimeout(resolve, 300));

  if (window._API_MODE === "offline") {
    throw new Error("Gagal terhubung ke jaringan (Offline Mode)");
  }

  const { method = "GET", body } = options;

  if (url === "/api/matkul" && method === "GET") {
    return new Response(JSON.stringify(mockDatabase.matkul), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url === "/api/tugas" && method === "GET") {
    return new Response(JSON.stringify(mockDatabase.tugas), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url === "/api/tugas" && method === "POST") {
    const data = JSON.parse(body);
    if (!data.judul || data.judul.trim().length < 3) {
      return new Response(JSON.stringify({ message: "Judul tugas minimal 3 karakter!" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const newItem = { id: Date.now(), ...data };
    mockDatabase.tugas.push(newItem);
    return new Response(JSON.stringify(newItem), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  if (url.startsWith("/api/tugas/") && method === "DELETE") {
    const id = url.split("/").pop();
    mockDatabase.tugas = mockDatabase.tugas.filter(t => t.id != id);
    return new Response(null, { status: 204 });
  }

  if (url.startsWith("/api/tugas/") && method === "PATCH") {
    const id = url.split("/").pop();
    const data = JSON.parse(body);
    const item = mockDatabase.tugas.find(t => t.id == id);
    if (item) {
      Object.assign(item, data);
      return new Response(JSON.stringify(item), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ message: "Tugas tidak ditemukan" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  return originalFetch(url, options);
};

window._API = {
  setMode: (mode) => { window._API_MODE = mode; console.log(`API Mode diubah ke: ${mode}`); }
};

async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Terjadi kesalahan pada server: ${res.status}`);
  }
  return res.json();
}

let state = {
  tugas: [],
  matkul: [],
  loading: true,
  error: null,
  filter: "Semua"
};

async function muatData() {
  state.loading = true;
  state.error = null;
  renderApp(); 

  try {
    const [dataTugas, dataMatkul] = await Promise.all([
      api("/api/tugas"),
      api("/api/matkul")
    ]);
    
    state.tugas = dataTugas;
    state.matkul = dataMatkul;

    const selectMatkul = document.getElementById("matkul");
    if (selectMatkul) {
      selectMatkul.innerHTML = '<option value="" disabled selected>Pilih mata kuliah</option>';
      dataMatkul.forEach(m => {
        selectMatkul.innerHTML += `<option value="${m.id}">${m.nama}</option>`;
      });
    }
  } catch (err) {
    state.error = err.message; 
  } finally {
    state.loading = false;
    renderApp(); 
  }
}

async function tambahTugas(e) {
  e.preventDefault();
  const form = e.target;
  const inputJudul = form.querySelector("#judul");
  const selectMatkul = form.querySelector("#matkul");
  const inputDeadline = form.querySelector("#deadline");
  const btnSubmit = form.querySelector("button[type='submit']");

  if (inputJudul.value.trim().length < 3) {
    alert("Judul tugas minimal 3 karakter!");
    return;
  }

  const payload = {
    judul: inputJudul.value.trim(),
    matkulId: selectMatkul.value,
    deadline: inputDeadline.value,
    status: "Not Started"
  };

  try {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Mengirim...";

    const tugasBaru = await api("/api/tugas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    state.tugas.push(tugasBaru);
    form.reset();
    renderApp();
  } catch (err) {
    alert(`Gagal menambah tugas: ${err.message}`);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Tambah Tugas";
  }
}

async function handleAksiTugas(e) {
  const target = e.target;
  const tr = target.closest("tr[data-id]");
  if (!tr) return;
  const id = tr.dataset.id;
  const tugasItem = state.tugas.find(t => t.id == id);
  if (!tugasItem) return;

  if (target.classList.contains("btn-hapus")) {
    try {
      await api(`/api/tugas/${id}`, { method: "DELETE" });
      state.tugas = state.tugas.filter(t => t.id != id);
      renderApp();
    } catch (err) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  }

  if (target.classList.contains("status-pill")) {
    const statusCycle = ["Not Started", "In Progress", "Done"];
    let currentIndex = statusCycle.indexOf(tugasItem.status || "Not Started");
    let nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    try {
      const updated = await api(`/api/tugas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, selesai: nextStatus === "Done" })
      });
      
      Object.assign(tugasItem, updated);
      renderApp();
    } catch (err) {
      alert(`Gagal memperbarui status: ${err.message}`);
    }
  }
}

function renderApp() {
  const tbody = document.getElementById("list-tugas");
  const statsCounter = document.getElementById("stats-counter");
  if (!tbody) return;

  if (state.loading) {
    tbody.innerHTML = `<tr><td colspan="6" class="skeleton">Memuat data dari server...</td></tr>`;
    statsCounter.textContent = "Memuat...";
    return;
  }

  if (state.error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="skeleton" style="color: #ffcccc;">
          Error: ${state.error} 
          <button onclick="muatData()" style="margin-left:10px; padding:2px 8px; cursor:pointer;">Coba Lagi</button>
        </td>
      </tr>`;
    if (statsCounter) statsCounter.textContent = "Gagal memuat";
    return;
  }

  const filteredTugas = state.tugas.filter(t => {
    const status = t.status || "Not Started";
    if (state.filter === "Semua") return true;
    return status === state.filter;
  });

  if (statsCounter) statsCounter.textContent = `${filteredTugas.length} tugas`;

  if (filteredTugas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="skeleton">Tidak ada tugas dalam kategori ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filteredTugas.forEach((t, index) => {
    const status = t.status || "Not Started";
    let statusClass = "not-started";
    if (status === "In Progress") statusClass = "in-progress";
    if (status === "Done") statusClass = "done";

    const matkulObj = state.matkul.find(m => m.id == t.matkulId);
    const namaMatkul = matkulObj ? matkulObj.nama : "-";

    const tr = document.createElement("tr");
    tr.setAttribute("data-id", t.id);
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${t.judul}</strong></td>
      <td>${namaMatkul}</td>
      <td>${t.deadline || "-"}</td>
      <td><button class="status-pill ${statusClass}" title="Klik untuk ubah status">${status}</button></td>
      <td><button class="btn-hapus">Hapus</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.querySelectorAll(".btn-filter").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    state.filter = e.target.dataset.filter;
    renderApp();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  muatData();
  const formTugas = document.getElementById("form-tugas");
  if (formTugas) formTugas.addEventListener("submit", tambahTugas);
  
  const listTugas = document.getElementById("list-tugas");
  if (listTugas) listTugas.addEventListener("click", handleAksiTugas);
});