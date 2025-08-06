const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ debug: true });

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require("./routes/auth");
const noteRoutes = require("./routes/notes");
const path = require("path");
// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

// Health check route
// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Notes App API is running!",
//   });
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

// 404 handler
// Error handling middleware
// app.get("*", (req, res) =>
//   res.sendFile(path.join(__dirname, "public", "index.html"))
// );

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
// in server.js – add ABOVE any “catch-all” routes
app.use(express.static(path.join(__dirname, "public")));

startServer();

module.exports = app;
