// requiring modules
const express = require("express");
const app = express();
const path = require("path");
const PORT = 7937;
//middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

//routing
app.get("/", (req, res) => {
  res.render("home");
});
app.get("/home", (req, res) => {
  res.redirect("home");
});
app.get("/about", (req, res) => {
  res.render("about");
});
app.get("/contact", (req, res) => {
  res.render("contact");
});
app.get("/gallery", (req, res) => {
  res.render("gallery");
});
app.get("/home.kg", (req, res) => {
  res.render("kg");
});
app.get("/home.primary", (req, res) => {
  res.render("primary");
});
app.get("/home.secondary", (req, res) => {
  res.render("secondary");
});
app.get("/news", (req, res) => {
  res.render("news");
});
app.get("/register", (req, res) => {
  res.render("app");
});
app.get("/register.portal", (req, res) => {
  res.render("register");
});
app.get("/register.portal/student", (req, res) => {
  res.render("studentRegister");
});
app.get("/register.portal/teacher", (req, res) => {
  res.render("teacherRegister");
});
app.get("/register.portal/formCompleted", (req, res) => {
  res.render("formCompleted.ejs");
});
app.get("/register.portal/codefill", (req, res) => {
  res.render("codefill");
});
app.get("/login", (req, res) => {
  res.render("login");
});
// running app
app.listen(PORT, () => {
  console.log(`App is running at PORT ${PORT}`);
});
