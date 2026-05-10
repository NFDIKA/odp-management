const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;
const SECRET_KEY = "FIBER_FLOW_SECURE_2024";

// Lokasi Database
const DB_PATH = path.join(__dirname, "data", "odp_db.json");
const USER_DB = path.join(__dirname, "data", "users.json");
const LOG_DB = path.join(__dirname, "data", "activity_logs.json");

// Inisialisasi Folder dan File
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"));
}

const initFile = (filePath, content = []) => {
  if (!fs.existsSync(filePath))
    fs.writeFileSync(filePath, JSON.stringify(content));
};

initFile(DB_PATH);
initFile(USER_DB);
initFile(LOG_DB);

// Middleware
app.use(cors());
app.use(express.json()); // Penting agar req.body tidak undefined
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

// Helper: Catat Log Aktivitas
const writeLog = (action, user, detail) => {
  try {
    const logs = JSON.parse(fs.readFileSync(LOG_DB, "utf-8"));
    logs.push({
      timestamp: new Date().toISOString(),
      action,
      user,
      detail,
    });
    fs.writeFileSync(LOG_DB, JSON.stringify(logs.slice(-500), null, 2)); // Simpan 500 log terakhir
  } catch (err) {
    console.error("Gagal menulis log:", err);
  }
};

// Middleware: Autentikasi (Penyatuan authenticate & verifyToken)
const authenticate = (req, res, next) => {
  // Cek token di Header atau Cookie
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader || req.cookies.token;

  if (!token)
    return res.status(401).json({ message: "Akses ditolak. Silakan login." });

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Token tidak valid atau sudah expired." });
  }
};

// UPDATE USER
app.put("/api/admin/users/:id", authenticate, async (req, res) => {
  // Hanya super admin
  if (req.user.role !== "full" || req.user.username !== "admin") {
    return res.status(403).json({
      message: "Hanya Super Admin yang diizinkan",
    });
  }

  try {
    const id = req.params.id;

    const users = JSON.parse(fs.readFileSync(USER_DB, "utf-8"));

    const index = users.findIndex((u) => String(u.id) === String(id));

    if (index === -1) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    // Data lama
    const existingUser = users[index];

    // Update data
    users[index] = {
      ...existingUser,
      username: req.body.username || existingUser.username,
      nama: req.body.nama || existingUser.nama,
      role: req.body.role || existingUser.role,
      organisasi: req.body.organisasi || existingUser.organisasi,
    };

    // Jika password diisi → hash ulang
    if (req.body.password) {
      users[index].password = await bcrypt.hash(req.body.password, 10);
    }

    fs.writeFileSync(USER_DB, JSON.stringify(users, null, 2));

    writeLog(
      "UPDATE_USER",
      req.user.nama,
      `Update user ${users[index].username}`,
    );

    res.json({
      message: "User berhasil diperbarui",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal update user",
    });
  }
});

// DELETE USER
app.delete("/api/admin/users/:id", authenticate, (req, res) => {
  // Hanya super admin
  if (req.user.role !== "full" || req.user.username !== "admin") {
    return res.status(403).json({
      message: "Hanya Super Admin yang diizinkan",
    });
  }

  try {
    const id = req.params.id;

    let users = JSON.parse(fs.readFileSync(USER_DB, "utf-8"));

    const targetUser = users.find((u) => String(u.id) === String(id));

    if (!targetUser) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    // Cegah admin hapus dirinya sendiri
    if (targetUser.username === "admin") {
      return res.status(400).json({
        message: "Admin utama tidak boleh dihapus",
      });
    }

    users = users.filter((u) => String(u.id) !== String(id));

    fs.writeFileSync(USER_DB, JSON.stringify(users, null, 2));

    writeLog(
      "DELETE_USER",
      req.user.nama,
      `Menghapus user ${targetUser.username}`,
    );

    res.json({
      message: "User berhasil dihapus",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus user",
    });
  }
});

/**
 * AUTHENTICATION API
 */

// 1. API Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USER_DB, "utf-8"));
    const user = users.find((u) => u.username === username);

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          nama: user.nama,
        },
        SECRET_KEY,
        { expiresIn: "24h" },
      );

      res.cookie("token", token, { httpOnly: true });
      res.json({ token, user: { nama: user.nama, role: user.role } });
    } else {
      res.status(401).json({ message: "Username atau Password salah" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses login" });
  }
});

// 2. API Add User (Hanya untuk Admin)
app.post("/api/admin/add-user", authenticate, async (req, res) => {
  if (req.user.role !== "full")
    return res.status(403).json({ message: "Bukan Admin" });

  try {
    const { username, password, nama, role, organisasi } = req.body;
    const users = JSON.parse(fs.readFileSync(USER_DB, "utf-8"));

    if (users.find((u) => u.username === username))
      return res.status(400).json({ message: "Username sudah terdaftar" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      password: hashedPassword,
      nama,
      role,
      organisasi,
    };

    users.push(newUser);
    fs.writeFileSync(USER_DB, JSON.stringify(users, null, 2));
    writeLog("ADD_USER", req.user.nama, `Menambah user baru: ${username}`);
    res.json({ message: "User berhasil dibuat" });
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat user" });
  }
});

// Di server.js, update middleware atau endpoint-nya
app.get("/api/admin/users", authenticate, (req, res) => {
  // Cek apakah role 'full' DAN username-nya 'admin'
  if (req.user.role !== "full" || req.user.username !== "admin") {
    return res
      .status(403)
      .json({ message: "Hanya Super Admin yang diizinkan" });
  }

  const users = JSON.parse(fs.readFileSync(USER_DB, "utf-8"));
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json(safeUsers);
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

app.get("/api/me", authenticate, (req, res) => {
  res.json(req.user);
});

/**
 * LOGIKA UTAMA (CRUD ODP)
 */

const checkGlobalDuplicate = (newData, existingData, excludeId = null) => {
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
    if (excludeId && item.id == excludeId) continue;
    for (const field of fieldsToCheck) {
      const val = newData[field];
      if (!val) continue;
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

// 1. Baca Semua Data ODP
// Tambahkan di server.js (di bawah middleware authenticate)
app.get("/api/odp", authenticate, (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) return res.json([]);
    const data = fs.readFileSync(DB_PATH, "utf-8");
    res.json(JSON.parse(data || "[]"));
  } catch (error) {
    res.status(500).json({ message: "Gagal membaca database" });
  }
});

// 2. Tambah Data ODP Baru
app.post("/api/odp", authenticate, (req, res) => {
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
      created_by: req.user.nama,
      created_at: new Date().toISOString(),
    };

    data.push(newOdp);
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    writeLog("CREATE_ODP", req.user.nama, `Menambah ODP ${newOdp.nama}`);

    res.status(201).json({ message: "Berhasil", data: newOdp });
  } catch (error) {
    res.status(500).json({ message: "Gagal menyimpan data" });
  }
});

// 3. Update Data ODP
app.put("/api/odp/:id", authenticate, (req, res) => {
  try {
    let data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    const id = req.params.id;
    const index = data.findIndex((item) => item.id == id);

    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...req.body,
        updated_by: req.user.nama,
        updated_at: new Date().toISOString(),
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
      writeLog(
        "UPDATE_ODP",
        req.user.nama,
        `Update data ODP ${data[index].nama}`,
      );
      res.json({ message: "Update berhasil" });
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal melakukan update" });
  }
});

// 4. Hapus Data ODP
app.delete("/api/odp/:id", authenticate, (req, res) => {
  try {
    let data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    const id = req.params.id;
    const targetOdp = data.find((item) => item.id == id);
    const filteredData = data.filter((item) => item.id != id);

    if (data.length !== filteredData.length) {
      fs.writeFileSync(DB_PATH, JSON.stringify(filteredData, null, 2));
      writeLog(
        "DELETE_ODP",
        req.user.nama,
        `Menghapus ODP ${targetOdp ? targetOdp.nama : id}`,
      );
      res.json({ message: "Data berhasil dihapus" });
    } else {
      res.status(404).json({ message: "Data tidak ditemukan" });
    }
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus data" });
  }
});

// 5. Fitur Cabut Layanan
app.post("/api/odp/cabut", authenticate, (req, res) => {
  try {
    const { nojar } = req.body;
    let data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    let foundInfo = null;

    for (const odp of data) {
      for (let i = 1; i <= 8; i++) {
        if (odp[`out${i}`] === nojar) {
          foundInfo = { id: odp.id, namaOdp: odp.nama, port: i };
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
app.post("/api/odp/import-bulk", authenticate, (req, res) => {
  try {
    const newData = req.body;
    let dbData = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

    const formattedData = newData.map((item) => ({
      id: item.id || Date.now() + Math.random(),
      ...item,
      created_by: req.user.nama,
      created_at: item.createdAt || new Date().toISOString(),
    }));

    const finalData = [...dbData, ...formattedData];
    fs.writeFileSync(DB_PATH, JSON.stringify(finalData, null, 2));
    writeLog(
      "IMPORT_EXCEL",
      req.user.nama,
      `Import bulk ${newData.length} data`,
    );
    res.json({ message: "Import berhasil" });
  } catch (error) {
    res.status(500).json({ message: "Gagal import data" });
  }
});

app.listen(PORT, () => {
  console.log("=========================================");
  console.log(`🚀 FIBERFLOW SERVER RUNNING`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log("=========================================");
});
