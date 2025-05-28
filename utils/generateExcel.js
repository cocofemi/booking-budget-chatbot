const path = require("path");

const ExcelJS = require("exceljs");

async function generateExcel(session) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Budget Summary");

  sheet.columns = [
    { header: "Item", key: "label", width: 30 },
    { header: "Amount", key: "value", width: 20 },
  ];
  sheet.getColumn("value").alignment = { horizontal: "right" };

  // Add session details
  sheet.addRow({
    label: "Your name",
    value: session.name,
  });
  sheet.addRow({
    label: "Booking Artist",
    value: session.artist,
  });
  sheet.addRow({
    label: "Location",
    value: session.location,
  });
  sheet.addRow({
    value: "Date",
    value: session.date,
  });
  sheet.addRow({
    label: "Currency",
    value: session.currency,
  });
  sheet.addRow({});

  // Add ticket information
  sheet.addRow({
    label: "Ticket Tiers",
    value: session.ticketCount || 0,
  });
  session.tickets.forEach((ticket) => {
    sheet.addRow({
      label: `${ticket.name} (${ticket.quantity} @ ${ticket.price})`,
      value: ticket.price * ticket.quantity,
    });
  });

  sheet.addRow({});
  session.expenses.forEach((exp) => {
    sheet.addRow({ label: exp.label, value: exp.amount });
  });

  sheet.addRow({});
  sheet.addRow({
    label: "Gross Revenue",
    value: session.summary.grossRevenue,
  });
  sheet.addRow({
    label: "Total Expenses",
    value: session.summary.totalExpenses,
  });
  sheet.addRow({ label: "Net Profit", value: session.summary.netProfit });

  const filePath = path.join(__dirname, "..", "tmp", "budget-summary.xlsx");
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

module.exports = generateExcel;
