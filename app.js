import express, { json } from "express";
const app = express();
const port = 3000;

app.use(json());

// Routes will be added here

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

import { hash, compare } from "bcrypt";
import { sign, verify } from "jsonwebtoken";

const users = [
  {
    email: "user@nutech-integrasi.com",
    first_name: "User",
    last_name: "Nutech",
    password: "abcdef1234",
  },
];

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Response handler
function sendResponse(res, status, message, data = null) {
  const response = {
    status: {
      code: status,
      message: message,
    },
    data: data,
  };
  res.status(status).json(response);
}

// Registration
app.post("/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  // Validate email format
  if (!isValidEmail(email)) {
    return sendResponse(res, 102, "Parameter email tidak sesuai format");
  }

  // Validate password length
  if (password.length < 8) {
    return sendResponse(res, 400, "Password must be at least 8 characters long");
  }

  // Check if user already exists
  if (users.find((user) => user.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password
  const hashedPassword = await hash(password, 10);

  // Create new user
  const newUser = { email, first_name, last_name, password: hashedPassword, balance: 0 };
  users.push(newUser);

  res.status(201).json({ message: "Registrasi berhasil silahkan login" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  if (!isValidEmail(email)) {
    return sendResponse(res, 400, "Invalid email format");
  }

  // Find user
  const user = users.find((user) => user.email === email);
  if (!user) {
    return res.status(102).json({ message: "Parameter email tidak sesuai format" });
  }

  // Check password
  const validPassword = await compare(password, user.password);
  if (!validPassword) {
    return res.status(103).json({ message: "Username atau password salah" });
  }

  // Generate JWT
  const token = sign({ email: user.email }, "your_secret_key", { expiresIn: "12h" });

  sendResponse(res, 200, "Login successful", { token });
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return sendResponse(res, 401, "Unauthorized");

  verify(token, "your_secret_key", (err, user) => {
    if (err) return sendResponse(res, 403, "Forbidden");
    req.user = user;
    next();
  });
}

// Check Balance
app.get("/balance", authenticateToken, (req, res) => {
  const user = users.find((user) => user.email === req.user.email);
  sendResponse(res, 200, "Get Balance Berhasil", { balance: user.balance });
});

// Top Up
app.post("/topup", authenticateToken, (req, res) => {
  const { amount } = req.body;
  const user = users.find((user) => user.email === req.user.email);

  user.balance += amount;

  sendResponse(res, 200, "Top Up Balance berhasil", { balance: user.balance });
});

// Transaction
app.post("/transaction", authenticateToken, (req, res) => {
  const { type, amount } = req.body;
  const user = users.find((user) => user.email === req.user.email);

  if (user.balance < amount) {
    return sendResponse(res, 400, "Insufficient balance");
  }

  user.balance -= amount;

  let message;
  switch (type) {
    case "credit":
      message = "Credit payment successful";
      break;
    case "game_voucher":
      message = "Game voucher purchased successfully";
      break;
    default:
      message = "Transaction successful";
  }

  sendResponse(res, 200, message, { balance: user.balance });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
