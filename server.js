require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const baseUrl = process.env.BASE_URL || "http://localhost:4242";

// Webhook Stripe
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Stripe webhook not configured");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status === "paid") {
      const player = session.metadata?.player;

      if (["messi", "ronaldo"].includes(player)) {
        const { error } = await supabase.from("votes").insert({
          player,
          stripe_session_id: session.id,
          paid_cents: session.amount_total
        });

        if (error && error.code !== "23505") {
          console.error("Erreur Supabase :", error);
          return res.status(500).send("Database error");
        }
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Créer un paiement
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Paiement non configuré." });
    }

    const player = req.body.player;
    const amount = req.body.amount;

    if (!["messi", "ronaldo"].includes(player)) {
      return res.status(400).json({ error: "Choix invalide." });
    }

    // Vérifier le montant envoyé
    const amountText = String(amount ?? "").trim().replace(",", ".");

    if (!/^\d{1,4}(\.\d{1,2})?$/.test(amountText)) {
      return res.status(400).json({
        error: "Montant invalide. Utilise un montant avec maximum deux décimales."
      });
    }

    const [euros, centimes = ""] = amountText.split(".");
    const amountCents = Number(euros) * 100 + Number(centimes.padEnd(2, "0"));

    if (amountCents < 50 || amountCents > 100000) {
      return res.status(400).json({
        error: "Le montant doit être compris entre 0,50 € et 1 000 €."
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: `Vote payant — ${player === "messi" ? "Lionel Messi" : "Cristiano Ronaldo"}`
          },
          unit_amount: amountCents
        },
        quantity: 1
      }],
      metadata: {
        player,
        amount_cents: String(amountCents)
      },
      success_url: `${baseUrl}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?annule=1`
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de lancer le paiement." });
  }
});

// Résultats des votes
app.get("/api/results", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("votes")
      .select("player");

    if (error) throw error;

    const totals = { messi: 0, ronaldo: 0 };

    for (const vote of data) {
      totals[vote.player]++;
    }

    const total = totals.messi + totals.ronaldo;

    res.json({
      ...totals,
      total,
      messiPercent: total ? Math.round(totals.messi / total * 100) : 0,
      ronaldoPercent: total ? Math.round(totals.ronaldo / total * 100) : 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de récupérer les votes." });
  }
});

app.listen(process.env.PORT || 4242, () => {
  console.log(`Site prêt sur ${baseUrl}`);
});