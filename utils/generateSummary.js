const generateSummary = (session) => {
  const tickets = session.tickets || [];
  const expenses = session.expenses || [];

  // 1. Revenue
  const grossRevenue = tickets.reduce(
    (sum, t) => sum + (t.price || 0) * (t.quantity || 0),
    0
  );

  console.log("🎯 Gross Revenue:", grossRevenue);

  // 2. Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // 3. Net Profit
  const netProfit = grossRevenue - totalExpenses;

  console.log("🎯 Total Expenses:", totalExpenses);

  // 4. Top 3 Expenses
  const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
  const topExpenses = sortedExpenses
    .slice(0, 3)
    .map((e) => `${e.label}: ${formatCurrency(e.amount, session.currency)}`);

  // 5. Summary Message (WhatsApp-friendly)
  const summary = `
📊 *Your Budget Summary*

👤 *Your Name:* ${session.name}
🎤 *Booking Artist:* ${session.artist}
🏟 *Venue:* ${session.venue}, ${session.location}
📅 *Date:* ${session.date}

💰 *Gross Revenue:* ${formatCurrency(grossRevenue, session.currency)}
💸 *Total Expenses:* ${formatCurrency(totalExpenses, session.currency)}
🧾 *Net Profit:* ${formatCurrency(netProfit, session.currency)}

🔝 *Top 3 Expenses:*
${topExpenses.join("\n")}

Thanks for budgeting with us! 💼
  `;

  return {
    grossRevenue,
    totalExpenses,
    netProfit,
    topExpenses,
    summaryText: summary.trim(),
  };
};

function formatCurrency(amount, currency) {
  const symbol =
    currency === "NGN"
      ? "₦"
      : currency === "USD"
      ? "$"
      : currency === "GBP"
      ? "£"
      : "";
  return `${symbol}${amount.toLocaleString()}`;
}

module.exports = { generateSummary, formatCurrency };
