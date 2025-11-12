const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const { Readable } = require("stream");

const PORT = 7937;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use("/register.portal", express.static(path.join(__dirname, "public")));

const MONGO_URL =
  "mongodb+srv://elanmpr:lifecipher@cluster0.ws20eb2.mongodb.net/IIS?appName=Cluster0";

let bucket;

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const conn = mongoose.connection;

conn.once("open", () => {
  bucket = new GridFSBucket(conn.db, { bucketName: "resumes" });
  console.log("MongoDB (Mongoose + GridFSBucket) connected");
});

const registrationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  coverLetter: { type: String, required: true },
  resumeFileId: { type: mongoose.Types.ObjectId },
  submittedAt: { type: Date, default: Date.now },
});

const Registration = mongoose.model("Registration", registrationSchema);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get("/", (req, res) => res.render("home"));
app.get("/home", (req, res) => res.redirect("/"));
app.get("/about", (req, res) => res.render("about"));
app.get("/contact", (req, res) => res.render("contact"));
app.get("/gallery", (req, res) => res.render("gallery"));
app.get("/admin", (req, res) => res.render("admin"));
app.get("/home.kg", (req, res) => res.render("kg"));
app.get("/home.primary", (req, res) => res.render("primary"));
app.get("/home.secondary", (req, res) => res.render("secondary"));
app.get("/news", (req, res) => res.render("news"));
app.get("/register", (req, res) => res.render("app"));
app.get("/register.portal", (req, res) => res.render("register"));
app.get("/register.portal/student", (req, res) =>
  res.render("studentRegister")
);
app.get("/register.portal/teacher", (req, res) =>
  res.render("teacherRegister")
);
app.get("/register.portal/formCompleted", (req, res) =>
  res.render("formCompleted")
);
app.get("/register.portal/codefill", (req, res) => res.render("codefill"));
app.get("/login", (req, res) => res.render("login"));

app.post(
  "/register.portal/submit",
  upload.single("resume"),
  async (req, res) => {
    try {
      const { fullName, phone, email, coverLetter } = req.body;

      if (!fullName || !phone || !email || !coverLetter) {
        return res.status(400).send("All text fields are required");
      }

      let resumeFileId = null;

      if (req.file && bucket) {
        const readableStream = Readable.from(req.file.buffer);
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
          contentType: req.file.mimetype,
        });

        await new Promise((resolve, reject) => {
          readableStream
            .pipe(uploadStream)
            .on("error", reject)
            .on("finish", () => {
              resumeFileId = uploadStream.id;
              resolve();
            });
        });
      }

      const registration = new Registration({
        fullName,
        phone,
        email,
        coverLetter,
        resumeFileId,
      });

      await registration.save();

      res.redirect("/register.portal/formCompleted");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
app.get("/admin/registrations", async (req, res) => {
  try {
    const [registrations, codefillEntries] = await Promise.all([
      Registration.find().sort({ submittedAt: -1 }),
      CodefillRegistration.find().sort({ submittedAt: -1 }),
    ]);

    res.render("adminRegistrations", { registrations, codefillEntries });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});
app.get("/resume/:id", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await bucket.find({ _id: fileId }).next();

    if (!file) return res.status(404).send("File not found");

    res.set("Content-Type", file.contentType);
    res.set("Content-Disposition", `attachment; filename="${file.filename}"`);

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream
      .pipe(res)
      .on("error", () => res.status(500).send("Stream error"));
  } catch (err) {
    res.status(500).send("Error downloading file");
  }
});
app.get("/admin/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ submittedAt: -1 });
    res.render("adminRegistrations", { registrations });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

app.get("/resume/:id", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await bucket.find({ _id: fileId }).next();
    if (!file) return res.status(404).send("File not found");

    res.set("Content-Type", file.contentType);
    res.set("Content-Disposition", `attachment; filename="${file.filename}"`);
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    res.status(500).send("Error downloading file");
  }
});

const codefillSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  fileId: { type: mongoose.Types.ObjectId },
  submittedAt: { type: Date, default: Date.now },
});

const CodefillRegistration = mongoose.model(
  "CodefillRegistration",
  codefillSchema
);

let codefillBucket;

conn.once("open", () => {
  bucket = new GridFSBucket(conn.db, { bucketName: "resumes" });
  codefillBucket = new GridFSBucket(conn.db, { bucketName: "codefill-files" });
  console.log("MongoDB (Mongoose + GridFSBucket) connected");
});
app.post(
  "/register.portal/submit-codefill",
  upload.single("file"),
  async (req, res) => {
    try {
      const { fullName, phone, email } = req.body;

      if (!fullName || !phone || !email) {
        return res.status(400).send("All fields are required");
      }

      let fileId = null;

      if (req.file && codefillBucket) {
        const readableStream = Readable.from(req.file.buffer);
        const uploadStream = codefillBucket.openUploadStream(
          req.file.originalname,
          {
            contentType: req.file.mimetype,
          }
        );

        await new Promise((resolve, reject) => {
          readableStream
            .pipe(uploadStream)
            .on("error", reject)
            .on("finish", () => {
              fileId = uploadStream.id;
              resolve();
            });
        });
      }

      const entry = new CodefillRegistration({
        fullName,
        phone,
        email,
        fileId,
      });

      await entry.save();

      res.redirect("/register.portal/formCompleted");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
app.get("/codefile/:id", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await codefillBucket.find({ _id: fileId }).next();
    if (!file) return res.status(404).send("File not found");

    res.set("Content-Type", file.contentType);
    res.set("Content-Disposition", `attachment; filename="${file.filename}"`);
    codefillBucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    res.status(500).send("Error downloading file");
  }
});
app.listen(PORT, () => {
  console.log(`App is running at http://localhost:${PORT}`);
});
