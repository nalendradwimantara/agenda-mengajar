const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const TASK_STORAGE_KEY = "agenda-mengajar-tugas-v1";

let tasks = [];
let editingTaskId = null;

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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDeadline(value) {
  if (!value) return "Tanpa deadline";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T00:00:00");
    return "Deadline: " + date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  return "Deadline: " + value;
}

function item(title, meta, badge = "") {
  return `
    <div class="item">
      <div class="item-main">
        <div class="item-title">${escapeHtml(title)}</div>
        <div class="item-meta">${meta}</div>
      </div>
      ${badge ? `<span class="badge ${badge.className || ""}">${escapeHtml(badge.text)}</span>` : ""}
    </div>
  `;
}

function taskItem(task, completed = false) {
  const priorityClass = task.prioritas === "Tinggi" ? "warning" : "";
  const priorityBadge = completed
    ? '<span class="badge success">Selesai</span>'
    : `<span class="badge ${priorityClass}">${escapeHtml(task.prioritas || "Sedang")}</span>`;

  const deadline = completed && task.tanggalSelesai
    ? `Selesai: ${escapeHtml(task.tanggalSelesai)}`
    : formatDeadline(task.deadline);

  return `
    <div class="task-item ${completed ? "completed" : ""}">
      <label class="task-check" title="${completed ? "Tandai belum selesai" : "Tandai selesai"}">
        <input type="checkbox" data-action="toggle" data-id="${escapeHtml(task.id)}" ${completed ? "checked" : ""}>
        <span class="checkmark"></span>
      </label>
      <div class="item-main">
        <div class="item-title">${escapeHtml(task.judul)}</div>
        <div class="item-meta">${deadline}</div>
      </div>
      <div class="task-actions">
        ${priorityBadge}
        <button class="small-button" type="button" data-action="edit" data-id="${escapeHtml(task.id)}">Edit</button>
        <button class="small-button danger" type="button" data-action="delete" data-id="${escapeHtml(task.id)}">Hapus</button>
      </div>
    </div>
  `;
}

function makeTaskId() {
  return "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function saveTasks() {
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
}

function loadStoredTasks(defaultTasks) {
  const saved = localStorage.getItem(TASK_STORAGE_KEY);

  if (!saved) {
    tasks = defaultTasks.map(task => ({
      id: makeTaskId(),
      judul: task.judul,
      deadline: task.deadline || "",
      prioritas: task.prioritas || "Sedang",
      selesai: Boolean(task.selesai),
      tanggalSelesai: task.tanggalSelesai || ""
    }));
    saveTasks();
    return;
  }

  try {
    tasks = JSON.parse(saved);
  } catch (error) {
    console.warn("Data tugas tersimpan rusak, kembali ke data awal.", error);
    tasks = defaultTasks;
    saveTasks();
  }
}

function renderTasks() {
  const active = tasks.filter(task => !task.selesai);
  const completed = tasks.filter(task => task.selesai);

  document.getElementById("activeTaskCount").textContent = active.length;
  document.getElementById("doneTaskCount").textContent = completed.length;

  document.getElementById("taskList").innerHTML = active.length
    ? active.map(task => taskItem(task)).join("")
    : '<div class="empty">Tidak ada pekerjaan aktif. Tambahkan tugas baru.</div>';

  document.getElementById("completedList").innerHTML = completed.length
    ? completed.map(task => taskItem(task, true)).join("")
    : '<div class="empty">Belum ada pekerjaan yang selesai.</div>';
}

function openTaskModal(task = null) {
  editingTaskId = task ? task.id : null;

  document.getElementById("modalTitle").textContent = task ? "Edit tugas" : "Tambah tugas";
  document.getElementById("taskId").value = task ? task.id : "";
  document.getElementById("taskTitle").value = task ? task.judul : "";
  document.getElementById("taskDeadline").value = task && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline || "") ? task.deadline : "";
  document.getElementById("taskPriority").value = task ? (task.prioritas || "Sedang") : "Sedang";

  const modal = document.getElementById("taskModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("taskTitle").focus();
}

function closeTaskModal() {
  const modal = document.getElementById("taskModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  editingTaskId = null;
}

function toggleTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  task.selesai = !task.selesai;
  task.tanggalSelesai = task.selesai
    ? new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "";

  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const confirmed = window.confirm(`Hapus tugas "${task.judul}"?`);
  if (!confirmed) return;

  tasks = tasks.filter(item => item.id !== id);
  saveTasks();
  renderTasks();
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const judul = document.getElementById("taskTitle").value.trim();
  const deadline = document.getElementById("taskDeadline").value;
  const prioritas = document.getElementById("taskPriority").value;

  if (!judul) return;

  if (editingTaskId) {
    const task = tasks.find(item => item.id === editingTaskId);
    if (task) {
      task.judul = judul;
      task.deadline = deadline;
      task.prioritas = prioritas;
    }
  } else {
    tasks.unshift({
      id: makeTaskId(),
      judul,
      deadline,
      prioritas,
      selesai: false,
      tanggalSelesai: ""
    });
  }

  saveTasks();
  renderTasks();
  closeTaskModal();
}

function setupTaskControls() {
  document.getElementById("addTaskButton").addEventListener("click", () => openTaskModal());
  document.getElementById("closeModalButton").addEventListener("click", closeTaskModal);
  document.getElementById("cancelTaskButton").addEventListener("click", closeTaskModal);
  document.getElementById("taskForm").addEventListener("submit", handleTaskSubmit);

  document.querySelector("[data-close-modal]").addEventListener("click", closeTaskModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeTaskModal();
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "edit") {
      const task = tasks.find(item => item.id === id);
      if (task) openTaskModal(task);
    }

    if (action === "delete") {
      deleteTask(id);
    }
  });

  document.addEventListener("change", event => {
    const checkbox = event.target.closest('input[data-action="toggle"]');
    if (checkbox) toggleTask(checkbox.dataset.id);
  });
}

async function loadData() {
  const [scheduleRes, dutyRes, taskRes] = await Promise.all([
    fetch("data/jadwal.json"),
    fetch("data/piket.json"),
    fetch("data/tugas.json")
  ]);

  const [schedule, duty, defaultTasks] = await Promise.all([
    scheduleRes.json(),
    dutyRes.json(),
    taskRes.json()
  ]);

  loadStoredTasks(defaultTasks);

  const day = todayKey();
  const todaySchedule = schedule.filter(x => x.hari === day);
  const todayDuty = duty.filter(x => x.hari === day);

  document.getElementById("scheduleCount").textContent = todaySchedule.length;

  document.getElementById("scheduleList").innerHTML = todaySchedule.length
    ? todaySchedule.map(x => item(x.mataPelajaran, `${escapeHtml(x.jam)} • ${escapeHtml(x.kelas)}`, { text: x.ruang })).join("")
    : '<div class="empty">Tidak ada jadwal mengajar hari ini.</div>';

  document.getElementById("dutyList").innerHTML = todayDuty.length
    ? todayDuty.map(x => item(x.kegiatan, escapeHtml(x.waktu), { text: x.lokasi })).join("")
    : '<div class="empty">Tidak ada jadwal piket hari ini.</div>';

  renderTasks();
}

updateClock();
setInterval(updateClock, 1000);
setupTaskControls();

loadData().catch(error => {
  console.error(error);
  document.querySelectorAll(".list").forEach(el => {
    el.innerHTML = '<div class="empty">Data belum dapat dimuat. Pastikan file data tersedia.</div>';
  });
});