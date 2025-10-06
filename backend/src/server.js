// const express = require("express")
import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";

import transactionRoute from "../src/routes/transactionRoute.js";

dotenv.config();

const app = express()
//middlerwear
app.use(rateLimiter);
app.use(express.json());
// app.use((req, res, next) => {
//   console.log("Hey we hit a req, the method is", req.method)
//   next();
// })

const PORT = process.env.PORT


app.get("/", (req, res) => {
  res.send("Its working")
})

app.use("/api/transaction", transactionRoute)

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is up and running on PORT: 5001");
  });
});
