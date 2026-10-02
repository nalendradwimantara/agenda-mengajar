# Agenda Mengajar

Dashboard pribadi untuk membantu mengelola agenda guru.

## Fitur
- Jadwal mengajar hari ini
- Jadwal piket
- Login akun
- Tugas tersimpan online di Supabase
- Tambah, edit, hapus, dan tandai tugas selesai
- Deadline dan prioritas tugas
- Data tugas dipisahkan berdasarkan akun menggunakan Row Level Security (RLS)

## Struktur
- `index.html` — halaman dashboard
- `style.css` — tampilan
- `script.js` — logika dashboard dan Supabase
- `data/jadwal.json` — data jadwal mengajar
- `data/piket.json` — data piket
- `data/tugas.json` — data contoh awal (tidak lagi digunakan untuk penyimpanan tugas online)

> Catatan: repository ini bersifat public. Jangan memasukkan data siswa atau informasi pribadi/sensitif ke file repository.

## Penyimpanan online

Dashboard menggunakan Supabase Auth dan tabel `public.tugas`. Pastikan Row Level Security (RLS) dan policy tabel `tugas` sudah dibuat sesuai konfigurasi project.

Kunci yang digunakan di browser adalah publishable key. Jangan pernah memasukkan `service_role` key atau password database ke repository.
