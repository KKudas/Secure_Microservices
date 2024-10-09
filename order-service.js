const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const { body, param, validationResult } = require("express-validator");
const https = require("https");
const fs = require("fs");

const app = express();
const port = 3003;
const SECRET_KEY = "Microservice";

// Load SSL certificates
const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 10, // 10 requests
  message: "Too many requests, try again later",
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateId = () => {
  return [param("orderId").trim().escape().isInt({ min: 1 })];
};

app.use(express.json());

let orderId = 1;
let orders = [];

// Authorization middleware to check user roles
function authorization(allowedRoles) {
  return (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(403).json("Unauthorized Access");
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).send("Forbidden");
      }

      if (!allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .send("Forbidden: You do not have permission to access this resource");
      }
      req.user = user;
      next();
    });
  };
}

// POST /orders: [Customer] Create a new order
app.post(
  "/orders",
  limiter,
  body("productId").trim().isInt({ min: 1 }),
  validateRequest,
  authorization(["customer"]),
  async (req, res) => {
    try {
      const productId = parseInt(req.body.productId);

      const productReq = await axios.get(
        `https://localhost:3001/products/${productId}`
      );

      const data = {
        orderId: orderId++,
        productId: req.body.productId,
        userId: req.user.id,
      };

      orders.push(data);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /orders/all: [Admin] Get all order list
app.get(
  "/orders/all",
  limiter,
  validateRequest,
  authorization(["admin"]),
  (req, res) => {
    try {
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /orders/:orderId: [Customer] Get order details.
app.get(
  "/orders/:orderId",
  limiter,
  validateId(),
  validateRequest,
  authorization(["customer"]),
  (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      const data = orders.find((order) => order.orderId === orderId);

      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /orders/:orderId: [Customer] Update an order.
app.put(
  "/orders/:orderId",
  limiter,
  validateId(),
  validateRequest,
  authorization(["customer"]),
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const index = orders.findIndex((order) => {
        return order.orderId === orderId;
      });

      if (index !== -1) {
        const productId = parseInt(req.body.productId);

        const productReq = await axios.get(
          `https://localhost:3001/products/${productId}`
        );

        orders[index] = { ...orders[index], ...req.body };
        res.status(200).json({ message: "Order successfully updated" });
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /orders/:orderId: [Customer] Delete an order.
app.delete(
  "/orders/:orderId",
  limiter,
  validateId(),
  validateRequest,
  authorization(["customer"]),
  (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const index = orders.findIndex((order) => {
        return order.orderId === orderId;
      });

      if (index !== -1) {
        orders.splice(index, 1);
        res.status(200).json({ message: "Order successfully deleted" });
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Secure HTTPS server
https.createServer(options, app).listen(port, () => {
  console.log(`Order service running securely on port ${port}`);
});
