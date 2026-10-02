const SUPABASE_URL = "https://gstvmjeipsyertvowxur.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fkbAKobSrq0NfAOg4iCsSw_O_Kb3atd";
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let tasks = [];
let editingTaskId = null;
let currentUser = null;

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
      day: "numeric", month: "long", year: "numeric"
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
  const deadline = completed && task.tanggal_selesai
    ? `Selesai: ${escapeHtml(formatCompletedDate(task.tanggal_selesai))}`
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

function formatCompletedDate(value) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
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
  document.getElementById("taskDeadline").value = task?.deadline || "";
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

function showAuthMessage(message, type = "") {
  const el = document.getElementById("authMessage");
  el.textContent = message;
  el.className = "auth-message" + (type ? " " + type : "");
}

async function loadCloudTasks() {
  if (!currentUser) {
    tasks = [];
    document.getElementById("taskList").innerHTML = '<div class="empty">Masuk untuk memuat tugas online.</div>';
    document.getElementById("completedList").innerHTML = '<div class="empty">Masuk untuk memuat tugas online.</div>';
    renderTasks();
    return;
  }

  const { data, error } = await supabaseClient
    .from("tugas")
    .select("id, judul, deadline, prioritas, selesai, tanggal_selesai, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("taskList").innerHTML = '<div class="empty">Tugas online belum dapat dimuat.</div>';
    document.getElementById("completedList").innerHTML = '<div class="empty">Periksa RLS dan struktur tabel Supabase.</div>';
    return;
  }

  tasks = data || [];
  renderTasks();
}

async function toggleTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const selesai = !task.selesai;
  const tanggal_selesai = selesai ? new Date().toISOString().slice(0, 10) : null;

  const { data, error } = await supabaseClient
    .from("tugas")
    .update({ selesai, tanggal_selesai })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Tugas belum dapat diperbarui. Pastikan Anda sudah masuk.");
    return;
  }

  const index = tasks.findIndex(item => item.id === id);
  tasks[index] = data;
  renderTasks();
}

async function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (!window.confirm(`Hapus tugas "${task.judul}"?`)) return;

  const { error } = await supabaseClient.from("tugas").delete().eq("id", id);

  if (error) {
    console.error(error);
    alert("Tugas belum dapat dihapus.");
    return;
  }

  tasks = tasks.filter(item => item.id !== id);
  renderTasks();
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  if (!currentUser) return;

  const judul = document.getElementById("taskTitle").value.trim();
  const deadline = document.getElementById("taskDeadline").value || null;
  const prioritas = document.getElementById("taskPriority").value;
  if (!judul) return;

  let error = null;

  if (editingTaskId) {
    const result = await supabaseClient
      .from("tugas")
      .update({ judul, deadline, prioritas })
      .eq("id", editingTaskId)
      .select()
      .single();
    error = result.error;
    if (!error) {
      const index = tasks.findIndex(item => item.id === editingTaskId);
      tasks[index] = result.data;
    }
  } else {
    const result = await supabaseClient
      .from("tugas")
      .insert({
        user_id: currentUser.id,
        judul,
        deadline,
        prioritas,
        selesai: false,
        tanggal_selesai: null
      })
      .select()
      .single();
    error = result.error;
    if (!error) tasks.unshift(result.data);
  }

  if (error) {
    console.error(error);
    alert("Tugas belum dapat disimpan. Periksa koneksi dan RLS Supabase.");
    return;
  }

  renderTasks();
  closeTaskModal();
}

async function login() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || !password) return;

  showAuthMessage("Sedang masuk...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showAuthMessage("Gagal masuk: " + error.message, "error");
    return;
  }

  currentUser = data.user;
  updateAuthUI();
  await loadCloudTasks();
  showAuthMessage("Berhasil masuk.", "success");
}

async function signup() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  if (!email || !password) return;

  showAuthMessage("Membuat akun...");
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });

  if (error) {
    showAuthMessage("Gagal membuat akun: " + error.message, "error");
    return;
  }

  if (data.session) {
    currentUser = data.user;
    updateAuthUI();
    await loadCloudTasks();
    showAuthMessage("Akun berhasil dibuat dan Anda sudah masuk.", "success");
  } else {
    showAuthMessage("Akun berhasil dibuat. Cek email untuk konfirmasi, lalu masuk.", "success");
  }
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error(error);
    showAuthMessage("Gagal keluar: " + error.message, "error");
    return;
  }
  currentUser = null;
  tasks = [];
  updateAuthUI();
}

function updateAuthUI() {
  const loggedIn = Boolean(currentUser);
  const authCard = document.getElementById("authCard");
  const addButton = document.getElementById("addTaskButton");
  const userEmail = document.getElementById("userEmail");
  const logoutButton = document.getElementById("logoutButton");

  authCard.style.display = loggedIn ? "none" : "grid";
  addButton.disabled = !loggedIn;
  userEmail.textContent = loggedIn ? currentUser.email : "Belum masuk";
  logoutButton.hidden = !loggedIn;

  if (!loggedIn) {
    document.getElementById("taskList").innerHTML = '<div class="empty">Masuk untuk memuat tugas online.</div>';
    document.getElementById("completedList").innerHTML = '<div class="empty">Masuk untuk memuat tugas online.</div>';
    document.getElementById("activeTaskCount").textContent = "0";
    document.getElementById("doneTaskCount").textContent = "0";
  }
}

function setupAuth() {
  document.getElementById("authForm").addEventListener("submit", async event => {
    event.preventDefault();
    await login();
  });

  document.querySelectorAll("[data-auth-action]").forEach(button => {
    button.addEventListener("click", async () => {
      if (button.dataset.authAction === "signup") await signup();
    });
  });

  document.getElementById("logoutButton").addEventListener("click", logout);
}

function setupTaskControls() {
  document.getElementById("addTaskButton").addEventListener("click", () => {
    if (currentUser) openTaskModal();
  });
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
    if (action === "delete") deleteTask(id);
  });

  document.addEventListener("change", event => {
    const checkbox = event.target.closest('input[data-action="toggle"]');
    if (checkbox) toggleTask(checkbox.dataset.id);
  });
}

async function loadData() {
  const [scheduleRes, dutyRes] = await Promise.all([
    fetch("data/jadwal.json"),
    fetch("data/piket.json")
  ]);

  const [schedule, duty] = await Promise.all([
    scheduleRes.json(),
    dutyRes.json()
  ]);

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
}

async function initAuth() {
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  updateAuthUI();
  if (currentUser) await loadCloudTasks();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser) await loadCloudTasks();
  });
}

updateClock();
setInterval(updateClock, 1000);
setupAuth();
setupTaskControls();

Promise.all([loadData(), initAuth()]).catch(error => {
  console.error(error);
  document.getElementById("scheduleList").innerHTML = '<div class="empty">Data jadwal belum dapat dimuat.</div>';
  document.getElementById("dutyList").innerHTML = '<div class="empty">Data piket belum dapat dimuat.</div>';
});