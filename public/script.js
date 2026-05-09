const Toast = Swal.mixin({
  background: "#1e293b",
  color: "#f8fafc",
  confirmButtonColor: "#3b82f6",
  cancelButtonColor: "#475569",
  heightAuto: false, // Mencegah pergeseran layout
  customClass: {
    container: "swal2-front", // Kita akan beri CSS khusus untuk class ini
    popup: "rounded-3xl border border-slate-700 shadow-2xl",
  },
});

// Inisialisasi konfigurasi global SweetAlert2 yang modern
const CustomSwal = Swal.mixin({
  background: "#1e293b",
  color: "#f8fafc",
  confirmButtonColor: "#2563eb",
  cancelButtonColor: "#475569",
  customClass: {
    popup: "modern-popup",
  },
});

function odpApp() {
  return {
    // --- STATE DATA USER & ADMIN ---
    userModal: false,

    // Ambil username dan role dari localStorage
    currentUsername: localStorage.getItem("username") || "",
    userRole: JSON.parse(localStorage.getItem("user") || "{}").role || "read",

    users: [],
    userForm: {
      username: "",
      password: "",
      nama: "",
      privilage: "read",
      organisasi: "",
    },

    // Fungsi mengambil data user dari server
    async fetchUsers() {
      // Proteksi: Hanya admin yang boleh fetch data user
      if (this.currentUsername !== "admin") return;

      try {
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: localStorage.getItem("token") },
        });
        if (res.ok) {
          this.users = await res.json();
        }
      } catch (err) {
        console.error("Gagal load users:", err);
      }
    },

    idleTimeout: null,
    // Set waktu idle dalam milidetik (contoh: 15 menit = 15 * 60 * 1000)
    IDLE_LIMIT: 15 * 60 * 1000,

    init() {
      // Panggil fungsi ini saat aplikasi dimuat
      this.resetIdleTimer();
      this.setupIdleListeners();
    },

    setupIdleListeners() {
      // Daftar aktivitas yang dianggap "aktif"
      const events = [
        "mousedown",
        "mousemove",
        "keypress",
        "scroll",
        "touchstart",
      ];

      events.forEach((name) => {
        document.addEventListener(name, () => this.resetIdleTimer(), true);
      });
    },

    resetIdleTimer() {
      // Hapus timer yang lama jika ada
      if (this.idleTimeout) clearTimeout(this.idleTimeout);

      // Buat timer baru
      this.idleTimeout = setTimeout(() => {
        this.logoutUser("Sesi berakhir karena tidak ada aktivitas.");
      }, this.IDLE_LIMIT);
    },

    async logoutUser(message = "Berhasil logout") {
      // Hapus semua data di localStorage
      localStorage.clear();

      await CustomSwal.fire({
        icon: "info",
        title: "Sesi Berakhir",
        text: message,
        timer: 3000,
        showConfirmButton: false,
      });

      window.location.href = "login.html";
    },

    // Fungsi tambah user
    async addUser() {
      if (!this.userForm.username || !this.userForm.password) {
        return CustomSwal.fire(
          "Error",
          "Username dan Password wajib diisi",
          "error",
        );
      }

      try {
        const res = await fetch("/api/admin/add-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("token"),
          },
          body: JSON.stringify(this.userForm),
        });

        if (res.ok) {
          CustomSwal.fire("Berhasil", "User berhasil ditambahkan", "success");
          this.fetchUsers(); // Refresh list
          this.userForm = {
            username: "",
            password: "",
            nama: "",
            privilage: "read",
            organisasi: "",
          };
        } else {
          const err = await res.json();
          CustomSwal.fire("Gagal", err.message, "error");
        }
      } catch (err) {
        console.error(err);
      }
    },

    // Fungsi hapus user
    async deleteUser(id, username) {
      const confirm = await CustomSwal.fire({
        title: "Hapus User?",
        text: `Yakin ingin menghapus akses ${username}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal",
      });

      if (confirm.isConfirmed) {
        try {
          const res = await fetch(`/api/admin/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: localStorage.getItem("token") },
          });
          if (res.ok) {
            this.fetchUsers();
            CustomSwal.fire(
              "Terhapus",
              "User telah dihapus dari sistem",
              "success",
            );
          }
        } catch (err) {
          console.error(err);
        }
      }
    },

    // Tambahkan di dalam return { ... } pada script.js
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // Radius bumi dalam meter
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Hasil dalam meter
    },

    currentUser: JSON.parse(localStorage.getItem("user") || "{}"),

    get userRole() {
      return this.currentUser.role || this.currentUser.privilage || "";
    },

    doLogout() {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    },

    async changePassword(newPass) {
      // API Call ke backend untuk update password user yang sedang login
    },
    // --- STATE DATA ---
    odps: [],
    searchQuery: "",
    filterArea: "",
    filterKota: "",
    filterCluster: "",
    filterStatus: "",
    modalOpen: false,
    viewOpen: false,
    cabutModal: false,
    isEdit: false,
    nojarCabut: "",
    form: {
      nama: "",
      level: "Level 2",
      area: "",
      cluster: "",
      latlong: "",
      in1: "",
      in2: "",
      out1: "",
      out2: "",
      out3: "",
      out4: "",
      out5: "",
      out6: "",
      out7: "",
      out8: "",
    },
    coverageModal: false,
    customerLatLong: "",
    nearbyOdps: [],
    viewItem: {},
    currentPage: 1,
    itemsPerPage: 10,

    resetFilters() {
      this.filterStatus = "";
      this.filterArea = "";
      this.filterCluster = "";
      this.filterKota = "";
      this.searchQuery = "";
      this.currentPage = 1;
    },
    // --- FUNGSI CABUT LAYANAN ---
    // Di dalam return { ... } odpApp
    async findAndConfirmCabut() {
      if (!this.nojarCabut || this.nojarCabut.length < 3) {
        return CustomSwal.fire(
          "Peringatan",
          "Masukkan Nojar yang valid",
          "warning",
        );
      }

      let targetOdp = null;
      let targetPortKey = null;

      // 1. Cari Nojar di seluruh data (Global Search)
      this.odps.forEach((odp) => {
        for (let i = 1; i <= 8; i++) {
          let portValue = odp["out" + i] ? odp["out" + i].toString() : "";
          if (portValue.includes(this.nojarCabut)) {
            targetOdp = odp;
            targetPortKey = "out" + i;
          }
        }
      });

      if (targetOdp) {
        // 2. Konfirmasi dengan SweetAlert
        const result = await CustomSwal.fire({
          title: "Data Ditemukan!",
          html: `Cabut <b>${this.nojarCabut}</b> dari <b>${targetOdp.nama}</b> (Port ${targetPortKey.toUpperCase()})?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Ya, Cabut!",
          confirmButtonColor: "#ef4444",
        });

        if (result.isConfirmed) {
          // 3. Eksekusi Update ke Server
          const updatedData = { ...targetOdp };
          updatedData[targetPortKey] = ""; // Kosongkan port

          try {
            const res = await fetch(`/api/odp/${targetOdp.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedData),
            });

            if (res.ok) {
              await this.fetchData(); // Refresh tabel & dashboard
              this.cabutModal = false;
              this.nojarCabut = ""; // Reset input
              CustomSwal.fire("Berhasil", "Layanan telah dicabut.", "success");
            }
          } catch (err) {
            CustomSwal.fire("Error", "Gagal menghubungi server", "error");
          }
        }
      } else {
        CustomSwal.fire(
          "Tidak Ditemukan",
          "Nojar tidak terdaftar di ODP manapun.",
          "error",
        );
      }
    },

    // Fungsi Proses Coverage
    checkCoverage() {
      if (!this.customerLatLong.includes(",")) {
        return CustomSwal.fire(
          "Error",
          "Format Latlong salah. Gunakan: lat, long",
          "error",
        );
      }

      const [custLat, custLong] = this.customerLatLong
        .split(",")
        .map((n) => parseFloat(n.trim()));

      if (isNaN(custLat) || isNaN(custLong)) {
        return CustomSwal.fire("Error", "Koordinat tidak valid", "error");
      }

      // Hitung jarak ke semua ODP
      const mapped = this.odps.map((odp) => {
        if (!odp.latlong) return { ...odp, distance: Infinity };
        const [oLat, oLong] = odp.latlong
          .split(",")
          .map((n) => parseFloat(n.trim()));
        return {
          ...odp,
          distance: this.calculateDistance(custLat, custLong, oLat, oLong),
        };
      });

      // Urutkan dan ambil 5 terdekat
      this.nearbyOdps = mapped
        .filter((o) => o.distance !== Infinity)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    },

    // Fungsi Lihat Rute di Google Maps
    viewRoute(odpLatLong) {
      const origin = this.customerLatLong.trim().replace(/\s/g, "");
      const destination = odpLatLong.trim().replace(/\s/g, "");
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
      window.open(url, "_blank");
    },

    getAvailablePorts(odp) {
      let occupied = 0;
      for (let i = 1; i <= 8; i++) {
        // Mencari field "out1" atau "Out 1" atau "OUT 1"
        const key = "out" + i;
        const alternativeKey = "Out " + i;
        const value = odp[key] || odp[alternativeKey] || odp[key.toUpperCase()];

        if (
          value &&
          value.toString().trim() !== "" &&
          value.toString().trim() !== "-"
        ) {
          occupied++;
        }
      }
      return 8 - occupied;
    },

    getDotColor(odp) {
      const sisa = this.getAvailablePorts(odp);
      if (sisa === 0) return "#ef4444"; // Merah
      if (sisa <= 2) return "#f59e0b"; // Kuning/Oranye
      return "#10b981"; // Hijau
    },

    downloadKMZ(odp) {
      if (!this.customerLatLong) {
        CustomSwal.fire("Info", "Tentukan lokasi pelanggan dulu", "info");
        return;
      }

      const [custLat, custLong] = this.customerLatLong
        .split(",")
        .map((n) => n.trim());
      const [odpLat, odpLong] = odp.latlong.split(",").map((n) => n.trim());

      // KML yang menginstruksikan Google untuk membuat rute jalan
      const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Rute Ke ${odp.nama}</name>
    <description>Klik pada 'Jalur Navigasi' untuk melihat rute di Google Maps</description>
    
    <Style id="routeStyle">
      <LineStyle><color>ff0000ff</color><width>5</width></LineStyle>
    </Style>

    <Placemark>
      <name>LOKASI PELANGGAN</name>
      <Point><coordinates>${custLong},${custLat},0</coordinates></Point>
    </Placemark>

    <Placemark>
      <name>ODP: ${odp.nama}</name>
      <Point><coordinates>${odpLong},${odpLat},0</coordinates></Point>
    </Placemark>

    <Placemark>
      <name>KLIK DISINI UNTUK RUTE JALAN</name>
      <description>
        <![CDATA[
          <a href="https://www.google.com/maps/dir/?api=1&origin=${custLat},${custLong}&destination=${odpLat},${odpLong}&travelmode=driving">
            Buka Navigasi Jalur Kabel di Google Maps
          </a>
        ]]>
      </description>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${custLong},${custLat},0 ${odpLong},${odpLat},0</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

      const blob = new Blob([kmlContent], {
        type: "application/vnd.google-earth.kml+xml",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RUTE_${odp.nama.replace(/\s+/g, "_")}.kml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    // Contoh di script.js
    async saveODP() {
      const res = await fetch("/api/odp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token"), // Kirim token login
        },
        body: JSON.stringify({
          ...this.formData,
          updatedBy: this.currentUser.nama, // Nama dari session login
          updatedAt: new Date().toISOString(),
        }),
      });
    },

    // --- LOGIKA FILTERING (Pusat Kendali Tabel) ---
    get filteredOdps() {
      if (!this.odps) return [];

      return this.odps.filter((item) => {
        // Normalisasi pencarian (Search Query)
        const s = this.searchQuery.toLowerCase().trim();
        const nama = (item.nama || "").toLowerCase();

        const searchMatch =
          !s ||
          nama.includes(s) ||
          ["out1", "out2", "out3", "out4", "out5", "out6", "out7", "out8"].some(
            (p) => (item[p] || "").toString().toLowerCase().includes(s),
          );

        // Normalisasi Filter Dropdown (PENTING: Gunakan String() untuk membandingkan)
        const areaMatch =
          !this.filterArea || String(item.area) === String(this.filterArea);
        const clusterMatch =
          !this.filterCluster ||
          String(item.cluster) === String(this.filterCluster);

        // Tambahkan filter status jika Anda menggunakannya
        const utilization = this.getUtilization(item);
        let statusMatch = true;
        if (this.filterStatus === "Available") statusMatch = utilization < 75;
        if (this.filterStatus === "Critical")
          statusMatch = utilization >= 75 && utilization < 100;
        if (this.filterStatus === "Full") statusMatch = utilization === 100;

        const matchesKota =
          this.filterKota === "" || item.kota === this.filterKota; // Tambahkan ini

        return (
          searchMatch && areaMatch && clusterMatch && statusMatch && matchesKota
        ); // Sertakan matchesKota dalam kondisi return
      });
    },

    // --- LOGIKA PAGINASI ---
    get paginatedOdps() {
      if (this.currentPage > this.totalPages) {
        this.currentPage = 1;
      }

      const perPage = Number(this.itemsPerPage);

      const start = (this.currentPage - 1) * perPage;
      const end = start + perPage;

      return this.filteredOdps.slice(start, end);
    },

    get totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredOdps.length / Number(this.itemsPerPage)),
      );
    },
    // --- FUNGSI HELPER ---
    getUtilization(item) {
      const ports = [
        "out1",
        "out2",
        "out3",
        "out4",
        "out5",
        "out6",
        "out7",
        "out8",
      ];
      const filled = ports.filter(
        (p) => item[p] && item[p].trim() !== "",
      ).length;
      return (filled / 8) * 100;
    },

    getStatusClass(item) {
      const percent = this.getUtilization(item);
      if (percent === 100) return "status-full";
      if (percent >= 75) return "status-warning";
      return "status-safe";
    },

    isNojarMatch(item) {
      if (!this.searchQuery || this.searchQuery.length < 3) return null;
      const s = this.searchQuery.toLowerCase();
      const portFields = [
        "out1",
        "out2",
        "out3",
        "out4",
        "out5",
        "out6",
        "out7",
        "out8",
      ];
      const matchIndex = portFields.findIndex(
        (p) => item[p] && item[p].toLowerCase().includes(s),
      );
      if (matchIndex !== -1 && !item.nama.toLowerCase().includes(s)) {
        return matchIndex + 1;
      }
      return null;
    },

    // --- ACTION HANDLERS ---
    async fetchData() {
      try {
        // Ambil token dari localStorage
        const token = localStorage.getItem("token");

        // Jika tidak ada token, arahkan kembali ke login
        if (!token) {
          window.location.href = "login.html";
          return;
        }

        const res = await fetch("/api/odp", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: token, // Kirim token untuk verifikasi
          },
        });

        // Jika server merespon Unauthorized atau Forbidden
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "login.html";
          return;
        }

        if (!res.ok) throw new Error("Gagal mengambil data dari server");

        this.odps = await res.json();

        console.log("TOTAL DATA:", this.odps.length);
        console.log("DATA:", this.odps);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
        // Tampilkan notifikasi error ke user jika perlu
        if (typeof CustomSwal !== "undefined") {
          CustomSwal.fire("Error", "Gagal memuat data ODP", "error");
        }
      }
    },

    formatInput(field) {
      let value = this.form[field];
      if (!value) return;
      value = value.toUpperCase();
      if (
        (field.startsWith("in") || field.startsWith("out")) &&
        /^\d+ $/.test(value)
      ) {
        value = value.trim() + " - ";
      }
      this.form[field] = value;
    },

    openInMaps(latlong) {
      if (!latlong || latlong.trim() === "") {
        return CustomSwal.fire(
          "Data Kosong",
          "Koordinat Latlong belum diisi!",
          "warning",
        );
      }
      const coords = latlong.trim().replace(/\s/g, "");
      const url = `https://www.google.com/maps/search/?api=1&query=${coords}`;
      window.open(url, "_blank");
    },

    // Fungsi untuk memeriksa duplikasi secara global di seluruh field yang relevan
    async copyText(text) {
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);

        Toast.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Copied",
          showConfirmButton: false,
          timer: 1200,
        });
      } catch (err) {
        console.error("Copy gagal", err);
      }
    },

    openModal() {
      this.isEdit = false;
      this.form = {
        nama: "",
        level: "Level 2",
        area: "",
        cluster: "",
        latlong: "",
        in1: "",
        in2: "",
        out1: "",
        out2: "",
        out3: "",
        out4: "",
        out5: "",
        out6: "",
        out7: "",
        out8: "",
      };
      this.modalOpen = true;
    },

    editOdp(item) {
      this.isEdit = true;
      this.form = { ...item };
      this.modalOpen = true;
    },

    viewData(item) {
      this.viewItem = item;
      this.viewOpen = true;
    },

    async saveData() {
      const portFields = [
        "in1",
        "in2",
        "out1",
        "out2",
        "out3",
        "out4",
        "out5",
        "out6",
        "out7",
        "out8",
      ];
      let duplicateInfo = null;

      const getNojarOnly = (text) =>
        text ? text.toString().replace(/\D/g, "") : "";

      for (const odp of this.odps) {
        if (this.isEdit && odp.id === this.form.id) continue;

        if (
          odp.nama.trim().toLowerCase() === this.form.nama.trim().toLowerCase()
        ) {
          duplicateInfo = {
            val: this.form.nama,
            location: "Nama ODP sudah ada",
          };
          break;
        }

        for (const field of portFields) {
          const inputNojar = getNojarOnly(this.form[field]);
          if (!inputNojar) continue;
          const isFound = portFields.some(
            (f) => getNojarOnly(odp[f]) === inputNojar,
          );
          if (isFound) {
            duplicateInfo = { val: inputNojar, location: odp.nama };
            break;
          }
        }
        if (duplicateInfo) break;
      }

      if (duplicateInfo) {
        return CustomSwal.fire({
          title: "Duplikasi Terdeteksi!",
          html: `Data <b>${duplicateInfo.val}</b> sudah ada di <b>${duplicateInfo.location}</b>.`,
          icon: "error",
        });
      }

      const method = this.isEdit ? "PUT" : "POST";
      const url = this.isEdit ? `/api/odp/${this.form.id}` : "/api/odp";

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });

        if (res.ok) {
          CustomSwal.fire({
            title: "Berhasil!",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          await this.fetchData();
          this.modalOpen = false;
        }
      } catch (error) {
        CustomSwal.fire("Error", "Koneksi bermasalah.", "error");
      }
    },

    async deleteOdp(id) {
      const result = await CustomSwal.fire({
        title: "Hapus ODP?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        confirmButtonText: "Ya, Hapus!",
      });

      if (result.isConfirmed) {
        await fetch(`/api/odp/${id}`, { method: "DELETE" });
        await this.fetchData();
        CustomSwal.fire("Terhapus!", "Data telah dihapus.", "success");
      }
    },

    exportToExcel() {
      const ws = XLSX.utils.json_to_sheet(this.odps);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ODPData");
      XLSX.writeFile(wb, `FiberFlow_${new Date().getTime()}.xlsx`);
    },

    // Fungsi untuk mengunduh template Excel dengan header yang sudah ditentukan
    downloadTemplate() {
      const headers = [
        [
          "nama",
          "kota",
          "level",
          "area",
          "cluster",
          "latlong",
          "in1",
          "in2",
          "out1",
          "out2",
          "out3",
          "out4",
          "out5",
          "out6",
          "out7",
          "out8",
        ],
      ];
      const ws = XLSX.utils.aoa_to_sheet(headers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "template_import_odp.xlsx");
    },

    async importFromExcel(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const rawJson = XLSX.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]],
          );

          // Normalisasi: Paksa header huruf kecil & hapus spasi tak terlihat
          const sanitizedData = rawJson.map((row) => {
            const newRow = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.toLowerCase().trim();
              // Pastikan Nojar/Data diubah ke String agar filter .includes() tidak error
              newRow[cleanKey] = row[key] ? row[key].toString().trim() : "";
            });

            // Pastikan ID dihasilkan jika tidak ada
            if (!newRow.id) newRow.id = Date.now() + Math.random();
            return newRow;
          });

          if (
            await CustomSwal.fire({
              title: "Import Data?",
              text: `Proses ${sanitizedData.length} data?`,
              icon: "question",
              showCancelButton: true,
            })
          ) {
            const res = await fetch("/api/odp/import-bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sanitizedData),
            });

            if (res.ok) {
              await this.fetchData(); // Ambil ulang data dari server
              event.target.value = ""; // Reset input file
              CustomSwal.fire(
                "Berhasil",
                "Data berhasil diimpor dan muncul di tabel",
                "success",
              );
            }
          }
        } catch (err) {
          CustomSwal.fire("Error", "Format file tidak didukung", "error");
        }
      };
      reader.readAsArrayBuffer(file);
    },
  };
}
