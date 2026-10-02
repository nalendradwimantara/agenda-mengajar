const SUPABASE_URL="https://gstvmjeipsyertvowxur.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_fkbAKobSrq0NfAOg4iCsSw_O_Kb3atd";
const{createClient}=window.supabase;const supabaseClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"agenda-mengajar-auth"}});
const dayNames=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const monthNames=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const dayOrder=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
let tasks=[],schedules=[],editingTaskId=null,editingScheduleId=null,currentUser=null,weekOffset=0;

function todayKey(){return dayNames[new Date().getDay()]}
function formatDate(date){return dayNames[date.getDay()]+", "+date.getDate()+" "+monthNames[date.getMonth()]+" "+date.getFullYear()}
function updateClock(){const now=new Date();document.getElementById("clock").textContent=now.toLocaleTimeString("id-ID");document.getElementById("todayLabel").textContent=formatDate(now)}
function escapeHtml(value=""){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function formatDeadline(value){if(!value)return"Tanpa deadline";if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const d=new Date(value+"T00:00:00");return"Deadline: "+d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}return"Deadline: "+value}
function formatCompletedDate(value){if(!value)return"";const d=new Date(value+"T00:00:00");return Number.isNaN(d.getTime())?value:d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}
function item(title,meta,badge=""){return `<div class="item"><div class="item-main"><div class="item-title">${escapeHtml(title)}</div><div class="item-meta">${meta}</div></div>${badge?`<span class="badge ${badge.className||""}">${escapeHtml(badge.text)}</span>`:""}</div>`}
function taskItem(task,completed=false){const pc=task.prioritas==="Tinggi"?"warning":"";const pb=completed?'<span class="badge success">Selesai</span>':`<span class="badge ${pc}">${escapeHtml(task.prioritas||"Sedang")}</span>`;const dl=completed&&task.tanggal_selesai?`Selesai: ${escapeHtml(formatCompletedDate(task.tanggal_selesai))}`:formatDeadline(task.deadline);return `<div class="task-item ${completed?"completed":""}"><label class="task-check" title="${completed?"Tandai belum selesai":"Tandai selesai"}"><input type="checkbox" data-action="toggle" data-id="${escapeHtml(task.id)}" ${completed?"checked":""}><span class="checkmark"></span></label><div class="item-main"><div class="item-title">${escapeHtml(task.judul)}</div><div class="item-meta">${dl}</div></div><div class="task-actions">${pb}<button class="small-button" type="button" data-action="edit" data-id="${escapeHtml(task.id)}">Edit</button><button class="small-button danger" type="button" data-action="delete" data-id="${escapeHtml(task.id)}">Hapus</button></div></div>`}

function renderTasks(){const active=tasks.filter(x=>!x.selesai),done=tasks.filter(x=>x.selesai);document.getElementById("taskList").innerHTML=active.length?active.map(x=>taskItem(x)).join(""):'<div class="empty">Tidak ada pekerjaan aktif. Tambahkan tugas baru.</div>';document.getElementById("completedList").innerHTML=done.length?done.map(x=>taskItem(x,true)).join(""):'<div class="empty">Belum ada pekerjaan yang selesai.</div>'}
function openTaskModal(task=null){editingTaskId=task?task.id:null;document.getElementById("modalTitle").textContent=task?"Edit tugas":"Tambah tugas";document.getElementById("taskId").value=task?task.id:"";document.getElementById("taskTitle").value=task?task.judul:"";document.getElementById("taskDeadline").value=task?.deadline||"";document.getElementById("taskPriority").value=task?(task.prioritas||"Sedang"):"Sedang";const m=document.getElementById("taskModal");m.classList.remove("hidden");m.setAttribute("aria-hidden","false");document.getElementById("taskTitle").focus()}
function closeTaskModal(){const m=document.getElementById("taskModal");m.classList.add("hidden");m.setAttribute("aria-hidden","true");editingTaskId=null}
function showAuthMessage(message,type=""){const e=document.getElementById("authMessage");e.textContent=message;e.className="auth-message"+(type?" "+type:"")}

async function loadCloudTasks(){if(!currentUser){tasks=[];renderTasks();return}const{data,error}=await supabaseClient.from("tugas").select("id,judul,deadline,prioritas,selesai,tanggal_selesai,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false});if(error){console.error(error);document.getElementById("taskList").innerHTML='<div class="empty">Tugas online belum dapat dimuat.</div>';return}tasks=data||[];renderTasks()}
async function toggleTask(id){const task=tasks.find(x=>x.id===id);if(!task)return;const selesai=!task.selesai,tanggal_selesai=selesai?new Date().toISOString().slice(0,10):null;const{data,error}=await supabaseClient.from("tugas").update({selesai,tanggal_selesai}).eq("id",id).select().single();if(error){alert("Tugas belum dapat diperbarui.");return}tasks[tasks.findIndex(x=>x.id===id)]=data;renderTasks()}
async function deleteTask(id){const task=tasks.find(x=>x.id===id);if(!task||!confirm(`Hapus tugas "${task.judul}"?`))return;const{error}=await supabaseClient.from("tugas").delete().eq("id",id);if(error){alert("Tugas belum dapat dihapus.");return}tasks=tasks.filter(x=>x.id!==id);renderTasks()}
async function handleTaskSubmit(e){e.preventDefault();if(!currentUser)return;const judul=document.getElementById("taskTitle").value.trim(),deadline=document.getElementById("taskDeadline").value||null,prioritas=document.getElementById("taskPriority").value;if(!judul)return;let result;if(editingTaskId)result=await supabaseClient.from("tugas").update({judul,deadline,prioritas}).eq("id",editingTaskId).select().single();else result=await supabaseClient.from("tugas").insert({user_id:currentUser.id,judul,deadline,prioritas,selesai:false,tanggal_selesai:null}).select().single();if(result.error){alert("Tugas belum dapat disimpan.");return}if(editingTaskId)tasks[tasks.findIndex(x=>x.id===editingTaskId)]=result.data;else tasks.unshift(result.data);renderTasks();closeTaskModal()}

function startOfWeek(offset=0){const d=new Date();d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1+(offset*7));return d}
function dateForDay(start,day){const d=new Date(start);d.setDate(start.getDate()+dayOrder.indexOf(day));return d}
function formatShortDate(d){return d.getDate()+" "+monthNames[d.getMonth()].slice(0,3)}
function scheduleSort(a,b){return (a.jam_mulai||"").localeCompare(b.jam_mulai||"")}
function renderWeeklyCalendar(){const start=startOfWeek(weekOffset),end=new Date(start);end.setDate(start.getDate()+6);document.getElementById("weekLabel").textContent=formatShortDate(start)+" – "+formatShortDate(end)+" "+end.getFullYear();const today=new Date();today.setHours(0,0,0,0);document.getElementById("weeklyCalendar").innerHTML=dayOrder.map(day=>{const date=dateForDay(start,day),todayClass=date.getTime()===today.getTime()?" today":"";const list=schedules.filter(x=>x.hari===day).sort(scheduleSort);return `<div class="day-column${todayClass}"><div class="day-header">${day}<span class="day-date">${formatShortDate(date)}</span></div>${list.length?list.map(schedule=>`<div class="calendar-item"><div class="calendar-time">${escapeHtml(schedule.jam_mulai)}–${escapeHtml(schedule.jam_selesai)}</div><div class="calendar-subject">${escapeHtml(schedule.mata_pelajaran)}</div><div class="calendar-meta">${escapeHtml(schedule.kelas)}${schedule.ruang?" • "+escapeHtml(schedule.ruang):""}</div><div class="calendar-actions"><button class="small-button" data-schedule-action="edit" data-id="${escapeHtml(schedule.id)}">Edit</button><button class="small-button danger" data-schedule-action="delete" data-id="${escapeHtml(schedule.id)}">Hapus</button></div></div>`).join(""):'<div class="day-empty">Tidak ada jadwal</div>'}</div>`}).join("")}
function renderTodaySchedule(){const day=todayKey(),list=schedules.filter(x=>x.hari===day).sort(scheduleSort);document.getElementById("scheduleList").innerHTML=list.length?list.map(x=>item(x.mata_pelajaran,`${escapeHtml(x.jam_mulai)}–${escapeHtml(x.jam_selesai)} • ${escapeHtml(x.kelas)}`,x.ruang?{text:x.ruang}:"")).join(""):'<div class="empty">Tidak ada jadwal mengajar hari ini.</div>'}
async function seedScheduleIfEmpty(){if(!currentUser)return;const{count,error}=await supabaseClient.from("jadwal_mengajar").select("id",{count:"exact",head:true}).eq("user_id",currentUser.id);if(error){console.error(error);return}if(count!==0)return;try{const res=await fetch("data/jadwal.json");const defaults=await res.json();if(!defaults.length)return;const rows=defaults.map(x=>{const [start,end]=(x.jam||"").split("–");return{user_id:currentUser.id,hari:x.hari,jam_mulai:start||"07:00",jam_selesai:end||"08:00",mata_pelajaran:x.mataPelajaran,kelas:x.kelas,ruang:x.ruang||null}});const ins=await supabaseClient.from("jadwal_mengajar").insert(rows);if(ins.error)console.error(ins.error)}catch(error){console.error(error)}}
async function loadSchedules(){if(!currentUser){schedules=[];renderWeeklyCalendar();renderTodaySchedule();return}const{data,error}=await supabaseClient.from("jadwal_mengajar").select("id,hari,jam_mulai,jam_selesai,mata_pelajaran,kelas,ruang,created_at").eq("user_id",currentUser.id).order("jam_mulai");if(error){console.error(error);document.getElementById("weeklyCalendar").innerHTML=`<div class="empty">Jadwal online belum dapat dimuat: ${escapeHtml(error.message||"Kesalahan tidak diketahui")}</div>`;return}schedules=data||[];renderWeeklyCalendar();renderTodaySchedule()}
function openScheduleModal(schedule=null){editingScheduleId=schedule?schedule.id:null;document.getElementById("scheduleModalTitle").textContent=schedule?"Edit jadwal":"Tambah jadwal";document.getElementById("scheduleId").value=schedule?schedule.id:"";document.getElementById("scheduleDay").value=schedule?.hari||"Senin";document.getElementById("scheduleStart").value=schedule?.jam_mulai||"07:00";document.getElementById("scheduleEnd").value=schedule?.jam_selesai||"08:00";document.getElementById("scheduleSubject").value=schedule?.mata_pelajaran||"";document.getElementById("scheduleClass").value=schedule?.kelas||"";document.getElementById("scheduleRoom").value=schedule?.ruang||"";const m=document.getElementById("scheduleModal");m.classList.remove("hidden");m.setAttribute("aria-hidden","false");document.getElementById("scheduleSubject").focus()}
function closeScheduleModal(){const m=document.getElementById("scheduleModal");m.classList.add("hidden");m.setAttribute("aria-hidden","true");editingScheduleId=null}
async function handleScheduleSubmit(e){e.preventDefault();if(!currentUser)return;const row={hari:document.getElementById("scheduleDay").value,jam_mulai:document.getElementById("scheduleStart").value,jam_selesai:document.getElementById("scheduleEnd").value,mata_pelajaran:document.getElementById("scheduleSubject").value.trim(),kelas:document.getElementById("scheduleClass").value.trim(),ruang:document.getElementById("scheduleRoom").value.trim()||null};if(row.jam_selesai<=row.jam_mulai){alert("Jam selesai harus lebih besar dari jam mulai.");return}if(!row.mata_pelajaran||!row.kelas)return;let result;if(editingScheduleId)result=await supabaseClient.from("jadwal_mengajar").update(row).eq("id",editingScheduleId).eq("user_id",currentUser.id).select().single();else result=await supabaseClient.from("jadwal_mengajar").insert({...row,user_id:currentUser.id}).select().single();if(result.error){console.error("Schedule save error:",result.error);alert("Jadwal belum tersimpan.\n\n"+(result.error.message||"Kesalahan tidak diketahui")+(result.error.details?"\n\nDetail: "+result.error.details:""));return}if(editingScheduleId)schedules[schedules.findIndex(x=>x.id===editingScheduleId)]=result.data;else schedules.push(result.data);renderWeeklyCalendar();renderTodaySchedule();closeScheduleModal()}
async function deleteSchedule(id){const schedule=schedules.find(x=>x.id===id);if(!schedule||!confirm(`Hapus jadwal "${schedule.mata_pelajaran}"?`))return;const{error}=await supabaseClient.from("jadwal_mengajar").delete().eq("id",id).eq("user_id",currentUser.id);if(error){alert("Jadwal belum dapat dihapus.");return}schedules=schedules.filter(x=>x.id!==id);renderWeeklyCalendar();renderTodaySchedule()}

async function login(){const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;if(!email||!password)return;showAuthMessage("Sedang masuk...");const{data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error){showAuthMessage("Gagal masuk: "+error.message,"error");return}currentUser=data.user;updateAuthUI();await loadCloudTasks();await loadSchedules();await loadActivities();showAuthMessage("Berhasil masuk.","success")}
async function signup(){const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;if(!email||!password)return;showAuthMessage("Membuat akun...");const{data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}});if(error){showAuthMessage("Gagal membuat akun: "+error.message,"error");return}if(data.session){currentUser=data.user;updateAuthUI();await loadCloudTasks();await loadSchedules();await loadActivities();showAuthMessage("Akun berhasil dibuat dan Anda sudah masuk.","success")}else showAuthMessage("Akun berhasil dibuat. Cek email untuk konfirmasi, lalu masuk.","success")}
async function logout(){const{error}=await supabaseClient.auth.signOut();if(error){showAuthMessage("Gagal keluar: "+error.message,"error");return}currentUser=null;tasks=[];schedules=[];updateAuthUI();renderWeeklyCalendar();renderTodaySchedule()}
function updateAuthUI(){const loggedIn=Boolean(currentUser);document.getElementById("authCard").style.display=loggedIn?"none":"grid";document.getElementById("addTaskButton").disabled=!loggedIn;document.getElementById("addScheduleButton").disabled=!loggedIn;document.getElementById("addActivityButton").disabled=!loggedIn;document.getElementById("userEmail").textContent=loggedIn?currentUser.email:"Belum masuk";document.getElementById("logoutButton").hidden=!loggedIn;if(!loggedIn){document.getElementById("taskList").innerHTML='<div class="empty">Masuk untuk memuat tugas online.</div>';document.getElementById("completedList").innerHTML='<div class="empty">Masuk untuk memuat tugas online.</div>';}}
function setupAuth(){document.getElementById("authForm").addEventListener("submit",e=>{e.preventDefault();login()});document.querySelectorAll("[data-auth-action]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.authAction==="signup")signup()}));document.getElementById("logoutButton").addEventListener("click",logout)}
function setupTaskControls(){document.getElementById("addTaskButton").addEventListener("click",()=>{if(currentUser)openTaskModal()});document.getElementById("closeModalButton").addEventListener("click",closeTaskModal);document.getElementById("cancelTaskButton").addEventListener("click",closeTaskModal);document.getElementById("taskForm").addEventListener("submit",handleTaskSubmit);document.querySelector("[data-close-modal]").addEventListener("click",closeTaskModal)}
function setupActivityControls(){document.getElementById("addActivityButton").addEventListener("click",()=>{if(currentUser)openActivityModal()});document.getElementById("closeActivityModalButton").addEventListener("click",closeActivityModal);document.getElementById("cancelActivityButton").addEventListener("click",closeActivityModal);document.querySelector("[data-close-activity-modal]").addEventListener("click",closeActivityModal);document.getElementById("activityForm").addEventListener("submit",handleActivitySubmit);document.getElementById("prevActivityMonthButton").addEventListener("click",()=>{activityMonth.setMonth(activityMonth.getMonth()-1);renderActivityCalendar()});document.getElementById("nextActivityMonthButton").addEventListener("click",()=>{activityMonth.setMonth(activityMonth.getMonth()+1);renderActivityCalendar()});document.addEventListener("click",e=>{const dateButton=e.target.closest("[data-activity-date]");if(dateButton){openActivityModal(null,dateButton.dataset.activityDate);return}const b=e.target.closest("[data-activity-action]");if(!b)return;const a=activities.find(x=>x.id===b.dataset.id);if(b.dataset.activityAction==="edit"&&a)openActivityModal(a);if(b.dataset.activityAction==="delete")deleteActivity(b.dataset.id)})}
function setupScheduleControls(){document.getElementById("addScheduleButton").addEventListener("click",()=>{if(currentUser)openScheduleModal()});document.getElementById("closeScheduleModalButton").addEventListener("click",closeScheduleModal);document.getElementById("cancelScheduleButton").addEventListener("click",closeScheduleModal);document.querySelector("[data-close-schedule-modal]").addEventListener("click",closeScheduleModal);document.getElementById("scheduleForm").addEventListener("submit",handleScheduleSubmit);document.getElementById("prevWeekButton").addEventListener("click",()=>{weekOffset--;renderWeeklyCalendar()});document.getElementById("nextWeekButton").addEventListener("click",()=>{weekOffset++;renderWeeklyCalendar()});document.addEventListener("click",e=>{const b=e.target.closest("[data-schedule-action]");if(!b)return;const s=schedules.find(x=>x.id===b.dataset.id);if(b.dataset.scheduleAction==="edit"&&s)openScheduleModal(s);if(b.dataset.scheduleAction==="delete")deleteSchedule(b.dataset.id)})}
function setupGlobal(){document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeTaskModal();closeScheduleModal();closeActivityModal()}});document.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const id=b.dataset.id;if(b.dataset.action==="edit"){const t=tasks.find(x=>x.id===id);if(t)openTaskModal(t)}if(b.dataset.action==="delete")deleteTask(id)});document.addEventListener("change",e=>{const c=e.target.closest('input[data-action="toggle"]');if(c)toggleTask(c.dataset.id)})}async function initAuth(){const{data,error}=await supabaseClient.auth.getSession();if(error)console.error("Auth session error:",error);currentUser=data?.session?.user||null;updateAuthUI();if(currentUser){await loadCloudTasks();await loadSchedules();await loadActivities()}supabaseClient.auth.onAuthStateChange((_event,session)=>{const nextUser=session?.user||null;if(nextUser?.id===currentUser?.id)return;currentUser=nextUser;updateAuthUI();if(currentUser){setTimeout(()=>{loadCloudTasks();loadSchedules();loadActivities()},0)}})}
const activityHolidays={
  "2026-01-01":"Tahun Baru Masehi",
  "2026-01-16":"Isra Mikraj Nabi Muhammad SAW",
  "2026-02-17":"Tahun Baru Imlek 2577 Kongzili",
  "2026-03-19":"Hari Suci Nyepi (Tahun Baru Saka 1948)",
  "2026-03-21":"Idulfitri 1447 Hijriah",
  "2026-03-22":"Idulfitri 1447 Hijriah",
  "2026-04-03":"Wafat Yesus Kristus",
  "2026-04-05":"Kebangkitan Yesus Kristus (Paskah)",
  "2026-05-01":"Hari Buruh Internasional",
  "2026-05-14":"Kenaikan Yesus Kristus",
  "2026-05-27":"Iduladha 1447 Hijriah",
  "2026-05-31":"Hari Raya Waisak 2570 BE",
  "2026-06-01":"Hari Lahir Pancasila",
  "2026-06-16":"1 Muharam Tahun Baru Islam 1448 Hijriah",
  "2026-08-17":"Proklamasi Kemerdekaan Republik Indonesia",
  "2026-08-25":"Maulid Nabi Muhammad SAW",
  "2026-12-25":"Kelahiran Yesus Kristus"
};
const activitySpecialDays={
  "2026-02-21":"Hari Peduli Sampah Nasional",
  "2026-04-21":"Hari Kartini",
  "2026-05-02":"Hari Pendidikan Nasional",
  "2026-05-20":"Hari Kebangkitan Nasional",
  "2026-06-17":"Hari Ulang Tahun DKI Jakarta",
  "2026-07-23":"Hari Anak Nasional",
  "2026-10-02":"Hari Batik Nasional",
  "2026-10-05":"Hari Guru Sedunia",
  "2026-10-28":"Hari Sumpah Pemuda",
  "2026-11-10":"Hari Pahlawan",
  "2026-11-25":"Hari Guru Nasional",
  "2026-12-22":"Hari Ibu"
};
let activities=[],activityMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),editingActivityId=null;

function activityDateKey(date){return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0")}
function formatActivityDate(value){if(!value)return"";const d=new Date(value+"T00:00:00");return d.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
function formatActivityTime(a){if(!a.jam_mulai)return"Seharian";return a.jam_selesai?a.jam_mulai+"–"+a.jam_selesai:a.jam_mulai}
function activityInfoForDate(key){return{holiday:activityHolidays[key]||"",special:activitySpecialDays[key]||""}}
function renderActivityCalendar(){
  const y=activityMonth.getFullYear(),m=activityMonth.getMonth();
  document.getElementById("activityMonthLabel").textContent=monthNames[m]+" "+y;
  const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),start=(first.getDay()||7)-1;
  const cells=[];
  for(let i=0;i<start;i++)cells.push('<div class="activity-day outside"></div>');
  for(let day=1;day<=days;day++){
    const d=new Date(y,m,day),key=activityDateKey(d),info=activityInfoForDate(key),list=activities.filter(x=>x.tanggal===key);
    const today=key===activityDateKey(new Date())?" today":"";
    const selected=list.length?" has-activity":"";
    const holiday=info.holiday?" holiday":"",special=info.special?" special":"";
    const title=[info.holiday,info.special,...list.map(x=>x.judul)].filter(Boolean).join(" • ");
    cells.push('<button class="activity-day'+today+selected+holiday+special+'" type="button" data-activity-date="'+key+'" title="'+escapeHtml(title)+'"><span>'+day+'</span>'+(list.length?'<i class="day-marker activity-marker"></i>':'')+(info.holiday?'<i class="day-marker holiday-marker"></i>':'')+(info.special?'<i class="day-marker special-marker"></i>':'')+'</button>');
  }
  document.getElementById("activityCalendar").innerHTML=cells.join("");
}
function activityCard(x){
  const meta=[formatActivityDate(x.tanggal),formatActivityTime(x),x.lokasi].filter(Boolean).map(escapeHtml).join(" • ");
  return '<div class="activity-entry"><div><div class="activity-entry-title">'+escapeHtml(x.judul)+'</div><div class="activity-entry-meta">'+meta+'</div>'+(x.kategori?'<span class="activity-category">'+escapeHtml(x.kategori)+'</span>':"")+(x.keterangan?'<div class="activity-note">'+escapeHtml(x.keterangan)+'</div>':"")+'</div><div class="activity-entry-actions"><button class="small-button" data-activity-action="edit" data-id="'+escapeHtml(x.id)+'">Edit</button><button class="small-button danger" data-activity-action="delete" data-id="'+escapeHtml(x.id)+'">Hapus</button></div></div>'
}
function specialCard(dateKey){
  const info=activityInfoForDate(dateKey),parts=[];
  if(info.holiday)parts.push('<div class="special-entry holiday-entry"><strong>Libur nasional</strong><span>'+escapeHtml(info.holiday)+'</span></div>');
  if(info.special)parts.push('<div class="special-entry"><strong>Hari spesial</strong><span>'+escapeHtml(info.special)+'</span></div>');
  return parts.join("");
}
function renderActivityAgenda(){
  const today=activityDateKey(new Date()),todayList=activities.filter(x=>x.tanggal===today).sort((a,b)=>(a.jam_mulai||"99:99").localeCompare(b.jam_mulai||"99:99"));
  const todayHtml=specialCard(today)+(todayList.length?todayList.map(activityCard).join(""):'<div class="empty">Tidak ada kegiatan sekolah hari ini.</div>');
  document.getElementById("todayActivities").innerHTML=todayHtml;
  const nowKey=today;
  const upcoming=[...activities].filter(x=>x.tanggal>nowKey).sort((a,b)=>(a.tanggal+(a.jam_mulai||"")).localeCompare(b.tanggal+(b.jam_mulai||""))).slice(0,5);
  const upcomingSpecial=[];
  for(let i=0;i<365&&upcomingSpecial.length<3;i++){
    const d=new Date();d.setDate(d.getDate()+i+1);const key=activityDateKey(d),info=activityInfoForDate(key);
    if(info.holiday||info.special)upcomingSpecial.push({tanggal:key,...info});
  }
  const merged=[...upcoming.map(x=>({type:"activity",value:x})),...upcomingSpecial.map(x=>({type:"special",value:x}))].sort((a,b)=>a.value.tanggal.localeCompare(b.value.tanggal)).slice(0,5);
  document.getElementById("upcomingActivities").innerHTML=merged.length?merged.map(x=>x.type==="activity"?activityCard(x.value):'<div class="special-entry '+(x.value.holiday?'holiday-entry':'')+'"><strong>'+escapeHtml(x.value.holiday?'Libur nasional':'Hari spesial')+'</strong><span>'+escapeHtml(x.value.holiday||x.value.special)+'</span><small>'+escapeHtml(formatActivityDate(x.value.tanggal))+'</small></div>').join(""):'<div class="empty">Belum ada agenda berikutnya.</div>';
}
async function loadActivities(){
  if(!currentUser){activities=[];renderActivityCalendar();renderActivityAgenda();return}
  const{data,error}=await supabaseClient.from("kegiatan").select("id,tanggal,nama_kegiatan,kategori,jam_mulai,jam_selesai,lokasi,keterangan,created_at").eq("user_id",currentUser.id).order("tanggal").order("jam_mulai");
  if(error){console.error("Activity load error:",error);document.getElementById("todayActivities").innerHTML='<div class="empty">Kegiatan online belum dapat dimuat.</div>';return}
  activities=(data||[]).map(x=>({id:x.id,tanggal:x.tanggal,judul:x.nama_kegiatan,kategori:x.kategori,jam_mulai:x.jam_mulai,jam_selesai:x.jam_selesai,lokasi:x.lokasi,keterangan:x.keterangan,created_at:x.created_at}));
  renderActivityCalendar();renderActivityAgenda();
}
function openActivityModal(activity=null,date=null){
  editingActivityId=activity?activity.id:null;
  document.getElementById("activityModalTitle").textContent=activity?"Edit kegiatan":"Tambah kegiatan";
  document.getElementById("activityId").value=activity?.id||"";
  document.getElementById("activityTitle").value=activity?.judul||"";
  document.getElementById("activityDate").value=activity?.tanggal||date||activityDateKey(new Date());
  document.getElementById("activityCategory").value=activity?.kategori||"Kegiatan sekolah";
  document.getElementById("activityStart").value=activity?.jam_mulai||"";
  document.getElementById("activityEnd").value=activity?.jam_selesai||"";
  document.getElementById("activityLocation").value=activity?.lokasi||"";
  document.getElementById("activityNotes").value=activity?.keterangan||"";
  const m=document.getElementById("activityModal");m.classList.remove("hidden");m.setAttribute("aria-hidden","false");document.getElementById("activityTitle").focus();
}
function closeActivityModal(){const m=document.getElementById("activityModal");m.classList.add("hidden");m.setAttribute("aria-hidden","true");editingActivityId=null}
async function handleActivitySubmit(e){
  e.preventDefault();if(!currentUser)return;
  const row={tanggal:document.getElementById("activityDate").value,nama_kegiatan:document.getElementById("activityTitle").value.trim(),kategori:document.getElementById("activityCategory").value,jam_mulai:document.getElementById("activityStart").value||null,jam_selesai:document.getElementById("activityEnd").value||null,lokasi:document.getElementById("activityLocation").value.trim()||null,keterangan:document.getElementById("activityNotes").value.trim()||null};
  if(!row.tanggal||!row.nama_kegiatan)return;
  if(row.jam_mulai&&row.jam_selesai&&row.jam_selesai<=row.jam_mulai){alert("Jam selesai harus lebih besar dari jam mulai.");return}
  let result;
  if(editingActivityId)result=await supabaseClient.from("kegiatan").update(row).eq("id",editingActivityId).eq("user_id",currentUser.id).select().single();
  else result=await supabaseClient.from("kegiatan").insert({...row,user_id:currentUser.id}).select().single();
  if(result.error){console.error("Activity save error:",result.error);alert("Kegiatan belum tersimpan.\n\n"+(result.error.message||"Kesalahan tidak diketahui"));return}
  const mapped={id:result.data.id,tanggal:result.data.tanggal,judul:result.data.nama_kegiatan,kategori:result.data.kategori,jam_mulai:result.data.jam_mulai,jam_selesai:result.data.jam_selesai,lokasi:result.data.lokasi,keterangan:result.data.keterangan,created_at:result.data.created_at};
  if(editingActivityId)activities[activities.findIndex(x=>x.id===editingActivityId)]=mapped;else activities.push(mapped);
  renderActivityCalendar();renderActivityAgenda();closeActivityModal();
}
async function deleteActivity(id){
  const a=activities.find(x=>x.id===id);if(!a||!confirm('Hapus kegiatan "'+a.judul+'"?'))return;
  const{error}=await supabaseClient.from("kegiatan").delete().eq("id",id).eq("user_id",currentUser.id);
  if(error){alert("Kegiatan belum dapat dihapus.");return}
  activities=activities.filter(x=>x.id!==id);renderActivityCalendar();renderActivityAgenda();
}

updateClock();setInterval(updateClock,1000);setupAuth();setupTaskControls();setupScheduleControls();setupActivityControls();setupGlobal();renderWeeklyCalendar();renderTodaySchedule();initAuth().catch(e=>console.error(e));