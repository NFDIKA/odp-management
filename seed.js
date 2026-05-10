const bcrypt = require("bcryptjs");
const { removeListener } = require("cluster");
const fs = require("fs");
const path = require("path");

const hashedPassword = bcrypt.hashSync("admin123", 10);
const adminUser = [
  {
    id: 1,
    username: "admin",
    password: hashedPassword,
    nama: "Super Admin",
    role: "full",
    organisasi: "Admin",
  },
];

fs.writeFileSync(
  path.join(__dirname, "data", "users.json"),
  JSON.stringify(adminUser, null, 2),
);
console.log("Admin User Created: admin / admin123");
