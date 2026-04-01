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

const User = mongoose.model("User", {
  login: String,
  password: String,
  role: String,
  schoolId: String,
  name: String
});

const School = mongoose.model("School", {
  name: String
});

const Group = mongoose.model("Group", {
  name: String,
  schoolId: String,
  students: [String]
});

const Room = mongoose.model("Room", {
  name: String,
  schoolId: String
});

const SubjectPlan = mongoose.model("SubjectPlan", {
  name: String,
  hours: Number,
  schoolId: String
});

const TimeSlot = mongoose.model("TimeSlot", {
  start: String,
  end: String,
  schoolId: String
});

const Schedule = mongoose.model("Schedule", {
  groupId: String,
  subject: String,
  teacher: String,
  room: String,
  date: Date,
  time: String,
  cancelled: { type: Boolean, default: false }
});

/* ===== ВСПОМОГАТЕЛЬНОЕ ===== */

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

  res.send({ schoolId: school._id, login, password });
});

// вход
app.post("/login", async (req, res) => {
  const { login, password } = req.body;

  const user = await User.findOne({ login, password });

  if (!user) return res.send({ status: "error" });

  res.send({ status: "ok", user });
});

// преподаватель
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

// группы
app.post("/create-group", async (req, res) => {
  const { name, schoolId } = req.body;

  const group = new Group({ name, schoolId, students: [] });
  await group.save();

  res.send({ status: "ok" });
});

// ученик
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

/* ===== ПРЕДМЕТЫ ===== */

app.post("/add-subject", async (req, res) => {
  const { name, hours, schoolId } = req.body;

  const subject = new SubjectPlan({ name, hours, schoolId });
  await subject.save();

  res.send({ status: "ok" });
});

app.get("/subjects", async (req, res) => {
  const data = await SubjectPlan.find({ schoolId: req.query.schoolId });
  res.send(data);
});

/* ===== КАБИНЕТЫ ===== */

app.post("/add-room", async (req, res) => {
  const { name, schoolId } = req.body;

  const room = new Room({ name, schoolId });
  await room.save();

  res.send({ status: "ok" });
});

app.get("/rooms", async (req, res) => {
  const data = await Room.find({ schoolId: req.query.schoolId });
  res.send(data);
});

/* ===== ВРЕМЯ ===== */

app.post("/add-timeslot", async (req, res) => {
  const { start, end, schoolId } = req.body;

  const slot = new TimeSlot({ start, end, schoolId });
  await slot.save();

  res.send({ status: "ok" });
});

app.get("/timeslots", async (req, res) => {
  const data = await TimeSlot.find({ schoolId: req.query.schoolId });
  res.send(data);
});

/* ===== РАСПИСАНИЕ ===== */

app.post("/generate-schedule", async (req, res) => {
  const { groupId, schoolId } = req.body;

  const subjects = await SubjectPlan.find({ schoolId });
  const rooms = await Room.find({ schoolId });
  const times = await TimeSlot.find({ schoolId });

  let startDate = new Date();

  for (let day = 0; day < 7; day++) {
    for (let t = 0; t < times.length; t++) {

      let subject = subjects[Math.floor(Math.random() * subjects.length)];
      let room = rooms[Math.floor(Math.random() * rooms.length)];

      const lesson = new Schedule({
        groupId,
        subject: subject.name,
        teacher: "Преподаватель",
        room: room.name,
        date: new Date(startDate.getTime() + day * 86400000),
        time: times[t].start + " - " + times[t].end
      });

      await lesson.save();
    }
  }

  res.send({ status: "created" });
});

app.get("/schedule", async (req, res) => {
  const lessons = await Schedule.find({ groupId: req.query.groupId });
  res.send(lessons);
});

app.post("/cancel-lesson", async (req, res) => {
  await Schedule.findByIdAndUpdate(req.body.lessonId, {
    cancelled: true
  });

  res.send({ status: "ok" });
});

/* ===== ЗАПУСК ===== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Сервер запущен"));
