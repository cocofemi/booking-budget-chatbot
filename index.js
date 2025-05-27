const express = require("express");
const dbConnect = require("./db/dbConnect");
const dotenv = require("./dotenvConfig")();
const Cors = require("cors");
const webhookRoutes = require("./routes/webhook");

dbConnect();

const app = express();
const port = process.env.PORT || 9000;
const baseURL = process.env.PUBLIC_BASE_URL || "http://localhost:9000";

const corsOption = {
  origin: "*",
  optionsSuccessStatus: 200,
};

app.use(Cors(corsOption));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(port, () => console.log(`Listening on port ${port}`));

app.use("/webhook", webhookRoutes);
