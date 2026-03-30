const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔗 ВСТАВИ СЮДА СВОЮ ССЫЛКУ ИЗ MONGODB ATLAS
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
  const user = new User(req.body);
  await user.save();
  res.send("Пользователь создан");
});

// вход
app.post("/login", async (req, res) => {
  const user = await User.findOne(req.body);

  if (user) {
    res.send({status: "ok", user});
  } else {
    res.send({status: "error"});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Сервер запущен"));
