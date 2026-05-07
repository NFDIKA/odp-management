const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Lokasi Database JSON
const DB_PATH = path.join(__dirname, "data", "odp_db.json");

// Pastikan folder 'data' ada, jika tidak, buat otomatis
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"));
}

// Pastikan file database ada, jika tidak, buat array kosong
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * LOGIKA UTAMA (CRUD)
 */

// 1. Baca Semua Data ODP
app.get("/api/odp", (req, res) => {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    res.status(200).json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ message: "Gagal membaca database" });
  }
});

// Tambahkan fungsi pembantu di server.js untuk cek duplikat semua field
const checkGlobalDuplicate = (newData, existingData, excludeId = null) => {
  // Ambil semua field yang ingin dicek (Nama, In1-2, Out1-8)
  const fieldsToCheck = [
    "nama",
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

  for (const item of existingData) {
    // Lewati jika sedang mengedit data yang sama
    if (excludeId && item.id === excludeId) continue;

    for (const field of fieldsToCheck) {
      const val = newData[field];
      if (!val) continue; // Abaikan field kosong

      // Cek apakah nilai tersebut sudah ada di field manapun di database
      const isMatch = fieldsToCheck.some(
        (f) =>
          item[f] &&
          item[f].toString().toLowerCase() === val.toString().toLowerCase(),
      );

      if (isMatch) return { duplicateValue: val, location: item.nama };
    }
  }
  return null;
};

// 2. Tambah Data ODP Baru
app.post("/api/odp", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    const duplicate = checkGlobalDuplicate(req.body, data);

    if (duplicate) {
      return res.status(400).json({
        message: `Data '${duplicate.duplicateValue}' sudah terdaftar di ODP: ${duplicate.location}`,
      });
    }

    const newOdp = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    data.push(newOdp);
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    res.status(201).json({ message: "Berhasil", data: newOdp });
  } catch (error) {
    res.status(500).json({ message: "Gagal menyimpan data" });
  }
});

// 3. Update Data ODP
app.put("/api/odp/:id", (req, res) => {
  try {
    let data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    const id = req.params.id; // Jangan gunakan parseInt

    // Gunakan == agar bisa mencocokkan string "123" dengan angka 123
    const index = data.findIndex((item) => item.id == id);
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
      res.json({ message: "Update berhasil" });
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal melakukan update" });
  }
});

// 4. Hapus Data ODP
app.delete("/api/odp/:id", (req, res) => {
  try {
    let data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    const id = req.params.id; // Jangan gunakan parseInt

    // Gunakan != untuk fleksibilitas tipe data
    const filteredData = data.filter((item) => item.id != id);

    if (data.length !== filteredData.length) {
      fs.writeFileSync(DB_PATH, JSON.stringify(filteredData, null, 2));
      res.json({ message: "Data berhasil dihapus" });
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus data" });
  }
});

// 5. Fitur Cabut Layanan (Mencari value di semua port out)
app.post("/api/odp/cabut", (req, res) => {
  try {
    const { nojar } = req.body;
    let data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    let foundInfo = null;

    // Mencari pelanggan di seluruh data ODP dan seluruh Port Out (1-8)
    for (const odp of data) {
      for (let i = 1; i <= 8; i++) {
        if (odp[`out${i}`] === nojar) {
          foundInfo = {
            id: odp.id,
            namaOdp: odp.nama,
            port: i,
          };
          break;
        }
      }
      if (foundInfo) break;
    }

    if (foundInfo) {
      res.json({
        message: `Pelanggan ditemukan di ${foundInfo.namaOdp} pada Port ${foundInfo.port}.`,
        data: foundInfo,
      });
    } else {
      res.status(404).json({ message: "Data pelanggan tidak ditemukan." });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses pencarian" });
  }
});

// 6. Import Bulk dari Excel
app.post("/api/odp/import-bulk", (req, res) => {
  try {
    const newData = req.body; // Array dari Excel
    let dbData = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

    // Tambahkan ID jika belum ada
    const formattedData = newData.map((item) => ({
      id: item.id || Date.now() + Math.random(),
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
    }));

    const finalData = [...dbData, ...formattedData];
    fs.writeFileSync(DB_PATH, JSON.stringify(finalData, null, 2));
    res.json({ message: "Import berhasil" });
  } catch (error) {
    res.status(500).json({ message: "Gagal import data" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log("=========================================");
  console.log(`🚀 FIBERFLOW SERVER RUNNING`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📂 DB: ${DB_PATH}`);
  console.log("=========================================");
});
