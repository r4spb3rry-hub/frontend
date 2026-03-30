const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔐 подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключен"))
  .catch(err => console.log(err));

// модель пользователя
const User = mongoose.model("User", {
  login: String,
  password: String,
  role: String
});

// регистрация
app.post("/register", async (req, res) => {
  const { login, password, role } = req.body;

  const user = new User({ login, password, role });
  await user.save();

  res.send({ status: "created" });
});

// вход
app.post("/login", async (req, res) => {
  const { login, password } = req.body;

  const user = await User.findOne({ login, password });

  if (user) {
    res.send({
      status: "ok",
      login: user.login,
      role: user.role
    });
  } else {
    res.send({ status: "error" });
  }
});

// список пользователей
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.send(users);
});

// удаление пользователя
app.delete("/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.send({ status: "deleted" });
});

// порт
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Сервер запущен"));
