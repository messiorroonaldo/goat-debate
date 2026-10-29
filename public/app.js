const toast = document.getElementById("toast");

function message(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4200);
}

async function loadResults() {
  try {
    const r = await fetch("/api/results");
    if (!r.ok) return;

    const d = await r.json();

    document.getElementById("messiPct").textContent = d.messiPercent + "%";
    document.getElementById("ronaldoPct").textContent = d.ronaldoPercent + "%";
    document.getElementById("total").textContent = d.total.toLocaleString("fr-FR");

    document.getElementById("messiBar").style.width = d.messiPercent + "%";
    document.getElementById("ronaldoBar").style.width = d.ronaldoPercent + "%";
  } catch (e) {}
}

document.querySelectorAll(".vote").forEach(button => {
  button.addEventListener("click", async () => {

    const amountInput = document.getElementById("voteAmount");

    if (!amountInput) {
      message("Le champ du montant est introuvable.");
      return;
    }

    const amount = amountInput.value.trim().replace(",", ".");
    const numericAmount = Number(amount);

    if (
      amount === "" ||
      !Number.isFinite(numericAmount) ||
      numericAmount < 0.50 ||
      numericAmount > 1000
    ) {
      message("Choisis un montant entre 0,50 € et 1 000 €.");
      return;
    }

    button.disabled = true;

    const original = button.innerHTML;
    button.textContent = "REDIRECTION…";

    try {
      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          player: button.dataset.player,
          amount: amount
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error || "Erreur de paiement");
      }

      location.href = d.url;

    } catch (e) {
      message(e.message);
      button.disabled = false;
      button.innerHTML = original;
    }
  });
});

loadResults();
setInterval(loadResults, 10000);

if (new URLSearchParams(location.search).has("annule")) {
  message("Paiement annulé : aucun vote n'a été enregistré.");
}