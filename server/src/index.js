import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`?? Khazprokhir API Server is running!`);
  console.log(`?? URL: http://localhost:${PORT}`);
  console.log(`??  Environment: ${NODE_ENV}`);
  console.log(`?? Health: http://localhost:${PORT}/api/health`);
  console.log(`========================================`);
});
