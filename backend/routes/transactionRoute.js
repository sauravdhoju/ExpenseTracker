import express from "express";
import { sql } from "../config/db.js";

const router = express.Router();

router.get("/api/transaction/:user_id", async(req, res) => {
  try {
    const { user_id } = req.params;
    
    const transaction = await sql`
      SELECT * FROM transaction WHERE user_id = ${user_id} ORDER BY created_at DESC 
    `
    res.status(200).json(transaction);

  } catch (error) {
    console.log("Error getting the transaction", error)
    res.status(500).json({ message: "Internal Server Error"})
  }    
})

router.post("/api/transaction", async (req, res) => {
  try {
    const { title, amount, category, user_id } = req.body  

    if( !title || !user_id || !category || amount == undefined ) {
      return res.status(400).json({ message: "All fields are required."})
    }

    const transaction = await sql`
      INSERT INTO transaction(user_id, title, amount, category)
      VALUES(${user_id}, ${title}, ${amount}, ${category})
      RETURNING *
    `
      console.log(transaction);
      res.status(201).json(transaction[0])
  } catch (error) {
    console.log("Error creating the transaction", error)
    res.status(500).json({ message: "Internal Server Error"})
  }
})

router.delete("/api/transaction/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({message: "Invalid transaction ID"});
    }

    const result = await sql`
      DELETE FROM transaction WHERE id = ${id} RETURNING *
    `
    if (result.length === 0) {
      return res.status(404).json({message: "Transaction not found"})
    }

    res.status(200).json({message: "Transaction deleted successfully."})

  } catch (error) {
      console.log("Error deleting the transaction", error)
      res.status(500).json({ message: "Internal Server Error"})
        
  }
})

router.get("/api/transaction/summary/:user_id", async(req, res) => {
  try {
    const { user_id } = req.params;

    const balanceResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as balance FROM transaction WHERE user_id = ${user_id}
    `

    const incomeResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as income FROM transaction
      WHERE user_id = ${user_id} AND amount > 0 
    `
    const expenseResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as expense FROM transaction
      WHERE user_id = ${user_id} AND amount < 0 
    `
    res.status(200).json({
      balance: balanceResult[0].balance,
      income: incomeResult[0].income,
      expense: expenseResult[0].expense,
    })
  } catch (error) {
      console.log("Error fetching the summary", error)
      res.status(500).json({ message: "Internal Server Error"})
    
  }
})

export default router 
