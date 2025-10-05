// const express = require("express")
import express from "express";
import dotenv from "dotenv";
import { sql } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";

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

async function initDB() {
    try {
        await sql`CREATE TABLE IF NOT EXISTS transaction(
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(255) NOT NULL,
            created_at DATE NOT NULL DEFAULT CURRENT_DATE
        )`
        console.log("Database initialized successfully")
    } catch (error) {
      console.log("Error initializing DB", error)
      process.exit(1) //staus code 1 means failure and status code 0 means success
    }
}

app.get("/", (req,res) => {
  res.send("Its working")
})

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is up and running on PORT: 5001");
  });
});
