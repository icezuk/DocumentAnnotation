import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(labels);
});

router.post("/", (req, res) => {
  const newLabel = {
    id: labels.length + 1,
    ...req.body
  };
  labels.push(newLabel);
  res.status(201).json(newLabel);
});

export default router;