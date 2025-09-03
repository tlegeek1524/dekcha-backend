const express = require('express');
const router = express.Router();
const { registerUser } = require('../controller/registerController');
const { loginUser,verifyToken,getAllEmployees,getAllCustomerUsers} = require('../controller/authController');

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-token', verifyToken);
router.get('/get/employees', getAllEmployees);
router.get('/get/customers', getAllCustomerUsers);

// Export the router
module.exports = router;