import express from "express";
import cors from "cors";

const app = express();

// Environment & CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS Policy: Origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "khazprokhir-backend",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== "production";
  const statusCode = err.status || 500;

  console.error(`[Server Error] ${err.message}`, isDev ? err.stack : "");

  res.status(statusCode).json({
    error: err.name || "InternalServerError",
    message: isDev ? err.message : "Terjadi kesalahan internal pada server",
    ...(isDev && { stack: err.stack }),
  });
});

export default app;
