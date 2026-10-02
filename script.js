const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function todayKey() {
  return dayNames[new Date().getDay()];
}

function formatDate(date) {
  return dayNames[date.getDay()] + ", " + date.getDate() + " " + monthNames[date.getMonth()] + " " + date.getFullYear();
}

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString("id-ID");
  document.getElementById("todayLabel").textContent = formatDate(now);
}

function item(title, meta, badge = "") {
  return `
    <div class="item">
      <div class="item-main">
        <div class="item-title">${title}</div>
        <div class="item-meta">${meta}</div>
      </div>
      ${badge ? `<span class="badge ${badge.className || ""}">${badge.text}</span>` : ""}
    </div>
  `;
}

async function loadData() {
  const [scheduleRes, dutyRes, taskRes] = await Promise.all([
    fetch("data/jadwal.json"),
    fetch("data/piket.json"),
    fetch("data/tugas.json")
  ]);

  const [schedule, duty, tasks] = await Promise.all([
    scheduleRes.json(), dutyRes.json(), taskRes.json()
  ]);

  const day = todayKey();
  const todaySchedule = schedule.filter(x => x.hari === day);
  const todayDuty = duty.filter(x => x.hari === day);
  const active = tasks.filter(x => !x.selesai);
  const completed = tasks.filter(x => x.selesai);

  document.getElementById("scheduleCount").textContent = todaySchedule.length;
  document.getElementById("activeTaskCount").textContent = active.length;
  document.getElementById("doneTaskCount").textContent = completed.length;

  document.getElementById("scheduleList").innerHTML = todaySchedule.length
    ? todaySchedule.map(x => item(x.mataPelajaran, `${x.jam} • ${x.kelas}`, { text: x.ruang })).join("")
    : '<div class="empty">Tidak ada jadwal mengajar hari ini.</div>';

  document.getElementById("dutyList").innerHTML = todayDuty.length
    ? todayDuty.map(x => item(x.kegiatan, x.waktu, { text: x.lokasi })).join("")
    : '<div class="empty">Tidak ada jadwal piket hari ini.</div>';

  document.getElementById("taskList").innerHTML = active.length
    ? active.map(x => item(x.judul, `Deadline: ${x.deadline}`, { text: x.prioritas, className: x.prioritas === "Tinggi" ? "warning" : "" })).join("")
    : '<div class="empty">Tidak ada pekerjaan aktif.</div>';

  document.getElementById("completedList").innerHTML = completed.length
    ? completed.map(x => item(x.judul, `Selesai: ${x.tanggalSelesai}`, { text: "Selesai", className: "success" })).join("")
    : '<div class="empty">Belum ada pekerjaan yang selesai.</div>';
}

updateClock();
setInterval(updateClock, 1000);
loadData().catch(error => {
  console.error(error);
  document.querySelectorAll(".list").forEach(el => {
    el.innerHTML = '<div class="empty">Data belum dapat dimuat. Pastikan file data tersedia.</div>';
  });
});
