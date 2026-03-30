const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключен"))
  .catch(err => console.log(err));

/* ===== МОДЕЛИ ===== */

// школа
const School = mongoose.model("School", {
  name: String,
  students: [String],
  teachers: [String]
});

// пользователь
const User = mongoose.model("User", {
  login: String,
  password: String,
  role: String,
  schoolId: String
});

/* ===== API ===== */

// получить школы
app.get("/schools", async (req, res) => {
  const schools = await School.find();
  res.send(schools);
});

// регистрация
app.post("/register", async (req, res) => {
  const { login, password, role, schoolId } = req.body;

  const school = await School.findById(schoolId);

  if (!school) {
    return res.send({ status: "error", message: "Школа не найдена" });
  }

  // проверка ученика
  if (role === "student" && !school.students.includes(login)) {
    return res.send({ status: "error", message: "Вас нет в списке учеников" });
  }

  // проверка преподавателя
  if (role === "teacher" && !school.teachers.includes(login)) {
    return res.send({ status: "error", message: "Вас нет в списке преподавателей" });
  }

  const user = new User({ login, password, role, schoolId });
  await user.save();

  res.send({ status: "created" });
});

// вход
app.post("/login", async (req, res) => {
  const { login, password } = req.body;

  const user = await User.findOne({ login, password });

  if (!user) {
    return res.send({ status: "error" });
  }

  res.send({
    status: "ok",
    login: user.login,
    role: user.role,
    schoolId: user.schoolId
  });
});

// пользователи школы
app.get("/users", async (req, res) => {
  const { schoolId } = req.query;

  const users = await User.find({ schoolId });
  res.send(users);
});

// удалить
app.delete("/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.send({ status: "deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Сервер запущен"));
