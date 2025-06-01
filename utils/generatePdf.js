const fs = require("fs");
const PDFDocument = require("pdfkit");
const path = require("path");

function generatePdf(session, filename = "budget-summary.pdf") {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(__dirname, "..", "tmp", filename);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // === Section Helpers ===
    const drawSectionHeader = (label, y, color = "#00bcd4") => {
      doc.rect(50, y, 500, 20).fill(color);
      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(label, 60, y + 5);
      doc.fillColor("black");
      return y + 30;
    };

    const addField = (label, value, y) => {
      doc.font("Helvetica-Bold").text(`${label}:`, 60, y);
      doc.font("Helvetica").text(value, 180, y);
      return y + 18;
    };

    let y = 50;

    // === Title ===
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Event Budget Summary", { align: "center" });
    y += 40;

    // === Event Info Section ===
    y = drawSectionHeader("Event Information", y, "#8bc34a");
    y = addField("Name", session.name, y);
    y = addField("Artist", session.artist, y);
    y = addField("Location", `${session.venue}, ${session.location}`, y);
    y = addField("Capacity", session.capacity || "N/A", y);
    y = addField("Date", session.date, y);
    y = addField("Currency", session.currency, y);
    y += 20;

    // === Ticket Info Section ===
    y = drawSectionHeader("Ticket Information", y, "#2196f3");
    y = addField("Tickets Tiers", session.ticketCount || 0, y);
    session.tickets?.forEach((ticket) => {
      doc
        .font("Helvetica")
        .text(
          `- ${ticket.name} (${ticket.quantity} @ ${formatCurrency(
            ticket.price,
            session.currency
          )})`,
          60,
          y
        );
      y += 16;
    });
    y += 20;
    // === Currency Section ===
    y = drawSectionHeader("Currency", y, "#8bc34a");
    doc
      .font("Helvetica")
      .text(`The currency used for this event is: ${session.currency}`, 60, y);
    y += 20;

    // === Summary Section ===
    y = drawSectionHeader("Budget Summary", y, "#ffc107");
    y = addField(
      "Gross Revenue",
      formatCurrency(session.summary?.grossRevenue, session.currency),
      y
    );
    y = addField(
      "Total Expenses",
      formatCurrency(session.summary?.totalExpenses, session.currency),
      y
    );
    y = addField(
      "Net Profit",
      formatCurrency(session.summary?.netProfit, session.currency),
      y
    );
    y += 20;

    // === Expense List ===
    y = drawSectionHeader("All Expenses", y, "#e91e63");
    session.expenses?.forEach((expense) => {
      if (y > 720) {
        doc.addPage();
        y = 50; // reset margin
        y = drawSectionHeader("AllExpenses (cont.)", y, "#e91e63");
      }
      doc
        .font("Helvetica")
        .text(
          `- ${expense.label}: ${formatCurrency(
            expense.amount,
            session.currency
          )}`,
          60,
          y
        );
      y += 16;
    });
    y += 20;

    // === Top 3 Expenses ===
    y = drawSectionHeader("Top 3 Expenses", y, "#e91e63");
    session.summary?.topExpenses?.forEach((item) => {
      // Add page if we're close to bottom
      if (y > 720) {
        doc.addPage();
        y = 50; // reset margin
        y = drawSectionHeader("Top 3 Expenses (cont.)", y, "#e91e63");
      }

      doc.font("Helvetica").text(`- ${item}`, 60, y);
      y += 16;
    });

    y += 20;

    // === AI Insight ===
    y = drawSectionHeader("AI Insight", y, "#9c27b0");
    doc
      .font("Helvetica-Oblique")
      .text(session.summary?.aiInsight || "No insight available", 60, y, {
        width: 480,
        align: "left",
      });

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

function formatCurrency(amount, currency) {
  const symbol =
    currency === "NGN"
      ? "₦"
      : currency === "USD"
      ? "$"
      : currency === "GBP"
      ? "£"
      : "";
  return `${symbol}${Number(amount).toLocaleString()}`;
}

const checkPageSpace = (doc, y, label) => {
  if (y > 720) {
    doc.addPage();
    y = 50;
    y = drawSectionHeader(label + " (cont.)", y, "#2196f3");
  }
  return y;
};

module.exports = generatePdf;
