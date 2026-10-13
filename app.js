async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Terjadi kesalahan pada server: ${res.status}`);
  }
  return res.json();
}

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

document.addEventListener("DOMContentLoaded", () => {
  muatData();
});