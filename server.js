const express = require('express');
const cors = require('cors');
const userRoutes = require('./route/userRoutes');
const menuRoutes = require('./route/listmenu');
const EmpauthRoutes = require('./route/empauthRoutes');
const pointsRoutes = require('./route/pointsRoutes');
const couponRoutes = require("./route/couponRoutes");
const cookieParser = require('cookie-parser');
const e = require('express');

// ตัวแปร environment
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/auth', EmpauthRoutes);
app.use('/api/points', pointsRoutes);
app.use("/api/coupon", couponRoutes);

// Test route
app.get('/api/test', (req, res) => {  
  res.json({ message: 'API is working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;