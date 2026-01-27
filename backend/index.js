// new
import labelsRoutes from "./routes/labels.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import authRoutes from "./routes/auth.routes.js";
import express from "express";
import path from "path";
import cors from "cors";

//const express = require("express");
const app = express();

// new
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/uploads", express.static("uploads"));

app.use("/api/labels", labelsRoutes);
app.use("/api/documents", documentsRoutes);

// old
app.get("/", (req, res) => {
  res.send("Annotation Tool Backend is running!");
});

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
