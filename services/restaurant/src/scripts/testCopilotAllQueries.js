import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { runAgentChat } from "../agent/agentService.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://arifahmed:arif7860@cluster0.nvu1g7y.mongodb.net/tomato?appName=Cluster0";

async function runTests() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI, { dbName: "Zomato_Clone" });

  const user = await mongoose.connection.db.collection("users").findOne({ email: "customer@gmail.com" });
  if (!user) {
    throw new Error("Customer user not found");
  }
  const userId = user._id.toString();
  console.log("Testing with customer userId:", userId);

  const testQueries = [
    { title: "Query 1: Find biryani under ₹300", prompt: "Find biryani under ₹300." },
    { title: "Query 2: Find chicken biryani under ₹250", prompt: "Find chicken biryani under ₹250." },
    { title: "Query 3: Show me highly rated biryani", prompt: "Show me highly rated biryani." },
    { title: "Query 4: Find vegetarian food under ₹200", prompt: "Find vegetarian food under ₹200." },
    { title: "Query 5: I want something spicy", prompt: "I want something spicy." },
    { title: "Query 6: Find pizza from a highly rated restaurant", prompt: "Find pizza from a highly rated restaurant." },
    { title: "Query 7: What's the cheapest burger?", prompt: "What's the cheapest burger?" },
    { title: "Query 8: What is in my cart?", prompt: "What is in my cart?" },
    { title: "Query 9: Add two chicken biryanis to my cart", prompt: "Add two chicken biryanis to my cart." },
    { title: "Query 10: Remove the Coke from my cart", prompt: "Remove the Coke from my cart." },
    { title: "Query 11: Show my latest order", prompt: "Show my latest order." },
    { title: "Query 12: Where is my order?", prompt: "Where is my order?" },
    { title: "Query 13: When will my order arrive?", prompt: "When will my order arrive?" },
    { title: "Query 14: What did I order previously?", prompt: "What did I order previously?" },
    { title: "Query 15: Reorder my last meal", prompt: "Reorder my last meal." },
    { title: "Query 16: Do I have any coupons?", prompt: "Do I have any coupons?" },
    { title: "Query 17: Find me the best available discount", prompt: "Find me the best available discount." },
  ];

  let passCount = 0;

  for (let i = 0; i < testQueries.length; i++) {
    const t = testQueries[i];
    console.log(`\n========================================`);
    console.log(`Testing [${i + 1}/${testQueries.length}]: ${t.title}`);
    console.log(`Prompt: "${t.prompt}"`);

    const res = await runAgentChat({
      userId,
      message: t.prompt,
      history: [],
    });

    console.log(`Reply Preview: ${res.reply.slice(0, 140).replace(/\n/g, " ")}...`);
    console.log(`Cards: ${res.cards?.length || 0} (${res.cards?.map((c) => c.type).join(", ") || "none"})`);
    console.log(`Mode: ${res.mode}`);
    console.log(`Action: ${res.actions?.[0] || res.action}`);

    // Verify response is not the old generic greeting
    const isGeneric = res.reply.includes("Welcome to BiteDash AI Copilot! I can help you discover dishes");
    const hasContent = res.reply && res.reply.length > 10;

    if (!isGeneric && hasContent) {
      console.log(`RESULT: ✅ PASS`);
      passCount++;
    } else {
      console.log(`RESULT: ❌ FAIL (Generic or empty response)`);
    }
  }

  // Multi-turn context test
  console.log(`\n========================================`);
  console.log(`Testing Multi-Turn Context Refinement`);
  
  // Clear cart first for test isolation
  await runAgentChat({ userId, message: "Clear cart", history: [] });

  // Turn 1: Find biryani
  const turn1 = await runAgentChat({ userId, message: "Find biryani", history: [] });
  console.log(`Turn 1: "Find biryani" -> Found ${turn1.cards?.length} cards`);

  // Turn 2: Under 300
  const turn2 = await runAgentChat({
    userId,
    message: "Under ₹300",
    history: [
      { role: "user", text: "Find biryani" },
      { role: "model", text: turn1.reply, cards: turn1.cards },
    ],
  });
  console.log(`Turn 2: "Under ₹300" -> Found ${turn2.cards?.length} cards`);

  // Turn 3: Add two
  const turn3 = await runAgentChat({
    userId,
    message: "Add two",
    history: [
      { role: "user", text: "Find biryani" },
      { role: "model", text: turn1.reply, cards: turn1.cards },
      { role: "user", text: "Under ₹300" },
      { role: "model", text: turn2.reply, cards: turn2.cards },
    ],
  });
  console.log(`Turn 3: "Add two" -> Reply: ${turn3.reply.slice(0, 100)}...`);

  const multiTurnPass = turn3.cartUpdated && turn3.reply.includes("2 ×");
  if (multiTurnPass) {
    console.log("Multi-Turn Context: ✅ PASS");
    passCount++;
  } else {
    console.log("Multi-Turn Context: ❌ FAIL");
  }

  console.log(`\n========================================`);
  console.log(`TOTAL SCORE: ${passCount} / ${testQueries.length + 1} PASSED`);
  await mongoose.disconnect();

  if (passCount === testQueries.length + 1) {
    console.log("ALL COPILOT TESTS PASSED! 🎉");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
