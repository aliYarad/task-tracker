async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Terjadi kesalahan pada server: ${res.status}`);
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
  try {
    const dataTugas = await api("/api/tugas");
    console.log("Data tugas berhasil dimuat:", dataTugas);
    
    const tbody = document.getElementById("list-tugas");
    tbody.innerHTML = "";
    dataTugas.forEach((t, index) => {
      tbody.innerHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${t.judul}</td>
          <td>${t.matkulId}</td>
          <td>${t.deadline}</td>
          <td>${t.status || 'Not Started'}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Gagal memuat data:", err.message);
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
    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${t.judul}</strong></td>
        <td>${t.matkulId}</td>
        <td>${t.deadline || "-"}</td>
        <td>${t.status || 'Not Started'}</td>
        <td>-</td>
      </tr>
    `;
  });
}

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

document.addEventListener("DOMContentLoaded", () => {
  muatData();
});