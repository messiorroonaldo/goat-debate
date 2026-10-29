require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("votes.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player TEXT NOT NULL CHECK(player IN ('messi','ronaldo')),
    stripe_session_id TEXT NOT NULL UNIQUE,
    paid_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const baseUrl = process.env.BASE_URL || "http://localhost:4242";

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Stripe webhook not configured");
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const player = session.metadata?.player;
      if (["messi", "ronaldo"].includes(player)) {
        db.prepare(`
          INSERT OR IGNORE INTO votes (player, stripe_session_id, paid_cents)
          VALUES (?, ?, ?)
        `).run(player, session.id, session.amount_total || 50);
      }
    }
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Paiement non configuré. Ajoutez votre clé Stripe." });
    const player = req.body.player;
    if (!["messi", "ronaldo"].includes(player)) {
      return res.status(400).json({ error: "Choix invalide." });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Vote payant — ${player === "messi" ? "Lionel Messi" : "Cristiano Ronaldo"}` },
          unit_amount: 50
        },
        quantity: 1
      }],
      metadata: { player },
      success_url: `${baseUrl}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?annule=1`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de lancer le paiement." });
  }
});

app.get("/api/results", (req, res) => {
  const rows = db.prepare("SELECT player, COUNT(*) AS votes FROM votes GROUP BY player").all();
  const totals = { messi: 0, ronaldo: 0 };
  for (const row of rows) totals[row.player] = row.votes;
  const total = totals.messi + totals.ronaldo;
  res.json({
    ...totals,
    total,
    messiPercent: total ? Math.round(totals.messi / total * 100) : 0,
    ronaldoPercent: total ? Math.round(totals.ronaldo / total * 100) : 0
  });
});

app.listen(process.env.PORT || 4242, () => {
  console.log(`Site prêt sur ${baseUrl}`);
});