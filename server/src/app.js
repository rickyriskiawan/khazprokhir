import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import masterRoutes from "./routes/master.routes.js";
import { targetTahunanRouter, targetBulananRouter } from "./routes/target.routes.js";
import { hctsRouter, rencanaPenyerahanRouter } from "./routes/planning.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import bonMasukRoutes from "./routes/bon-masuk.routes.js";
import sortirRoutes from "./routes/sortir.routes.js";
import kemasRoutes from "./routes/kemas.routes.js";

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
app.get("/api/health", async (req, res) => {
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "disconnected";
  }

  res.status(200).json({
    status: "ok",
    service: "khazprokhir-backend",
    database: dbStatus,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/target-tahunan", targetTahunanRouter);
app.use("/api/target-bulanan", targetBulananRouter);
app.use("/api/hcts", hctsRouter);
app.use("/api/rencana-penyerahan", rencanaPenyerahanRouter);
app.use("/api/batches", batchRoutes);
app.use("/api/bon-masuk", bonMasukRoutes);
app.use("/api/sortir", sortirRoutes);
app.use("/api/kemas", kemasRoutes);

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
