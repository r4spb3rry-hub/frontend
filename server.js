const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ===== ПОДКЛЮЧЕНИЕ ===== */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB подключен"))
  .catch(err => console.log(err));

/* ===== МОДЕЛИ ===== */

// пользователь
const User = mongoose.model("User", {
  login: String,
  password: String,
  role: String, // student / teacher / admin
  schoolId: String,
  name: String
});

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

// предмет
const Subject = mongoose.model("Subject", {
  name: String
});

// кабинет
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

/* ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===== */

function generateLogin(name) {
  return name.toLowerCase().replaceAll(" ", "") + Math.floor(Math.random() * 1000);
}

function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

/* ===== API ===== */

// создать школу + админа
app.post("/create-school", async (req, res) => {
  const { schoolName, adminName } = req.body;

  const school = new School({ name: schoolName });
  await school.save();

  const login = generateLogin(adminName);
  const password = generatePassword();

  const admin = new User({
    login,
    password,
    role: "admin",
    schoolId: school._id,
    name: adminName
  });

  await admin.save();

  res.send({
    status: "created",
    schoolId: school._id,
    login,
    password
  });
});

// вход
app.post("/login", async (req, res) => {
  const { login, password } = req.body;

  const user = await User.findOne({ login, password });

  if (!user) return res.send({ status: "error" });

  res.send({
    status: "ok",
    user
  });
});

// добавить преподавателя
app.post("/add-teacher", async (req, res) => {
  const { name, schoolId } = req.body;

  const login = generateLogin(name);
  const password = generatePassword();

  const teacher = new User({
    login,
    password,
    role: "teacher",
    schoolId,
    name
  });

  await teacher.save();

  res.send({ login, password });
});

// создать группу
app.post("/create-group", async (req, res) => {
  const { name, schoolId } = req.body;

  const group = new Group({ name, schoolId, students: [] });
  await group.save();

  res.send({ status: "created" });
});

// добавить ученика
app.post("/add-student", async (req, res) => {
  const { name, groupId, schoolId } = req.body;

  const login = generateLogin(name);
  const password = generatePassword();

  await Group.findByIdAndUpdate(groupId, {
    $push: { students: name }
  });

  const student = new User({
    login,
    password,
    role: "student",
    schoolId,
    name
  });

  await student.save();

  res.send({ login, password });
});

// получить пользователей школы
app.get("/users", async (req, res) => {
  const { schoolId } = req.query;

  const users = await User.find({ schoolId });
  res.send(users);
});

// получить все данные (для тебя)
app.get("/all-data", async (req, res) => {
  const users = await User.find();
  const schools = await School.find();
  const groups = await Group.find();

  res.send({ users, schools, groups });
});

/* ===== РАСПИСАНИЕ ===== */

// генерация расписания
app.post("/generate-schedule", async (req, res) => {
  const { groupId, schoolId } = req.body;

  const subjects = await Subject.find();
  const rooms = await Room.find({ schoolId });

  const times = ["09:00", "11:00", "13:00"];
  let startDate = new Date();

  for (let day = 0; day < 7; day++) {
    for (let i = 0; i < times.length; i++) {

      let subject = subjects[Math.floor(Math.random() * subjects.length)];
      let room = rooms[Math.floor(Math.random() * rooms.length)];

      const lesson = new Schedule({
        groupId,
        subject: subject.name,
        teacher: "Преподаватель",
        room: room.name,
        date: new Date(startDate.getTime() + day * 86400000),
        time: times[i]
      });

      await lesson.save();
    }
  }

  res.send({ status: "created" });
});

// получить расписание
app.get("/schedule", async (req, res) => {
  const { groupId } = req.query;

  const lessons = await Schedule.find({ groupId });
  res.send(lessons);
});

// отменить занятие
app.post("/cancel-lesson", async (req, res) => {
  const { lessonId } = req.body;

  await Schedule.findByIdAndUpdate(lessonId, {
    cancelled: true
  });

  res.send({ status: "ok" });
});

/* ===== ЗАПУСК ===== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Сервер запущен на порту " + PORT));
