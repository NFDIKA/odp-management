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
    viewItem: {},

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
        const res = await fetch("/api/odp");
        this.odps = await res.json();
      } catch (error) {
        console.error("Gagal mengambil data:", error);
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
