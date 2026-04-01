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
  name: String
});

// группа
const Group = mongoose.model("Group", {
  name: String,
  schoolId: String,
  students: [String]
});

// пользователь
const User = mongoose.model("User", {
  login: String,
  password: String,
  role: String,
  schoolId: String
});

/* ===== API ===== */

// создать школу (админ)
app.post("/create-school", async (req, res) => {
  const { name } = req.body;

  const school = new School({ name });
  await school.save();

  res.send({
    status: "created",
    schoolId: school._id
  });
});

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

  const user = new User({ login, password, role, schoolId });
  await user.save();

  res.send({ status: "created" });
});

// вход
app.post("/login", async (req, res) => {
  const { login, password } = req.body;

  const user = await User.findOne({ login, password });
  if (!user) return res.send({ status: "error" });

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

// ВСЕ данные (ТОЛЬКО ДЛЯ ТЕБЯ)
app.get("/all-data", async (req, res) => {
  const users = await User.find();
  const schools = await School.find();
  const groups = await Group.find();

  res.send({ users, schools, groups });
});

// создать группу
app.post("/create-group", async (req, res) => {
  const { name, schoolId } = req.body;

  const group = new Group({ name, schoolId, students: [] });
  await group.save();

  res.send({ status: "created" });
});

// добавить ученика в группу
app.post("/add-student", async (req, res) => {
  const { groupId, login } = req.body;

  await Group.findByIdAndUpdate(groupId, {
    $push: { students: login }
  });

  res.send({ status: "ok" });
});

// получить группы
app.get("/groups", async (req, res) => {
  const { schoolId } = req.query;

  const groups = await Group.find({ schoolId });
  res.send(groups);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Сервер запущен"));
/* ===== РАСПИСАНИЕ ===== */

const Schedule = mongoose.model("Schedule", {
  groupId: String,
  subject: String,
  teacher: String,
  date: String,
  time: String
});

// создать расписание
app.post("/generate-schedule", async (req, res) => {
  const { groupId } = req.body;

  const days = ["Понедельник","Вторник","Среда","Четверг","Пятница"];
  const times = ["09:00","11:00","13:00"];

  for (let i = 0; i < days.length; i++) {
    for (let j = 0; j < times.length; j++) {

      const lesson = new Schedule({
        groupId,
        subject: "Предмет " + (j+1),
        teacher: "Преподаватель",
        date: days[i],
        time: times[j]
      });

      await lesson.save();
    }
  }

  res.send({ status: "created" });
});

// получить расписание группы
app.get("/schedule", async (req, res) => {
  const { groupId } = req.query;

  /* ===== СПРАВОЧНИКИ ===== */

// предметы
const Subject = mongoose.model("Subject", {
  name: String
});

// кабинеты
const Room = mongoose.model("Room", {
  name: String,
  schoolId: String
});

// расписание
const Schedule = mongoose.model("Schedule", {
  groupId: String,
  subject: String,
  teacher: String,
  room: String,
  date: Date,
  time: String,
  cancelled: { type: Boolean, default: false }
});

  const lessons = await Schedule.find({ groupId });
  res.send(lessons);
});
