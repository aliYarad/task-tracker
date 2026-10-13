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
    const dataTugas = await api("/api/tugas");
    state.tugas = dataTugas;
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

  if (state.loading) {
    tbody.innerHTML = `<tr><td colspan="6" class="skeleton">Memuat data dari server...</td></tr>`;
    statsCounter.textContent = "Memuat...";
    return;
  }

  if (state.error) {
    tbody.innerHTML = `<tr><td colspan="6" class="skeleton" style="color: #ffcccc;">Error: ${state.error} <button onclick="muatData()" style="margin-left:10px; padding:2px 8px;">Coba Lagi</button></td></tr>`;
    statsCounter.textContent = "Gagal memuat";
    return;
  }

  statsCounter.textContent = `${state.tugas.length} tugas`;

  if (state.tugas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="skeleton">Belum ada tugas yang ditambahkan.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  state.tugas.forEach((t, index) => {
    const status = t.status || "Not Started";
    let statusClass = "not-started";
    if (status === "In Progress") statusClass = "in-progress";
    if (status === "Done") statusClass = "done";

    const tr = document.createElement("tr");
    tr.setAttribute("data-id", t.id);
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${t.judul}</strong></td>
      <td>${t.matkulId}</td>
      <td>${t.deadline || "-"}</td>
      <td><button class="status-pill ${statusClass}" title="Klik untuk ubah status">${status}</button></td>
      <td><button class="btn-hapus">Hapus</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  muatData();
  document.getElementById("form-tugas").addEventListener("submit", tambahTugas);
  document.getElementById("list-tugas").addEventListener("click", handleAksiTugas);
});