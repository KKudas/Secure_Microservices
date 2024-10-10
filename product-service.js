const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, param, validationResult } = require("express-validator");
const https = require("https");
const fs = require("fs");

// Load SSL certificates
const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost-cert.pem"),
};

const app = express();
const port = 3001;
const SECRET_KEY = "Microservice";

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 10, // 10 request
  message: "Too many request, try again later",
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateId = () => {
  return [param("productId").trim().escape().isInt({ min: 1 })];
};

app.use(express.json());

let productId = 1;
let products = [];

// Check Token and Authorization middleware to check user roles
function authorization(allowedRoles) {
  return (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(403).json("Unauthorized");
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).send("Forbidden");
      }

      if (!allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .send(
            "Forbidden: You do not have permission to access this resource"
          );
      }
      req.user = user;
      next();
    });
  };
}

// POST /: [Admin] Add a new product.
app.post(
  "/",
  limiter,
  [
    body("prodName").notEmpty().isString().trim().escape(),
    body("prodPrice").trim().escape().isInt({ min: 1 }),
  ],
  validateRequest,
  authorization(["admin"]),
  (req, res) => {
    try {
      const data = {
        productId: productId++,
        prodName: req.body.prodName,
        prodPrice: req.body.prodPrice,
      };
      products.push(data);
      res.status(201).json(data);
    } catch (error) {
      res
        .status(500)
        .json({ error: "There was an error adding a new product" });
    }
  }
);

// GET /all: Get all products
app.get("/all", limiter, validateRequest, (req, res) => {
  try {
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /:productId: Get product details by ID.
app.get("/:productId", limiter, validateId(), validateRequest, (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const item = products.find((product) => product.productId === productId);

    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "There was an error fetching the product" });
  }
});

// PUT /:productId: [Admin] Update a product
app.put(
  "/:productId",
  limiter,
  validateId(),
  validateRequest,
  authorization(["admin"]),
  (req, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const index = products.findIndex((product) => {
        return product.productId === productId;
      });

      if (index !== -1) {
        products[index] = { ...products[index], ...req.body };
        res.status(200).json({ message: "Product successfully updated" });
      } else {
        res
          .status(500)
          .json({ error: "There was an error updating the product" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /:productId: [Admin] Delete a product
app.delete(
  "/:productId",
  limiter,
  validateId(),
  validateRequest,
  authorization(["admin"]),
  (req, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const index = products.findIndex((product) => {
        return product.productId === productId;
      });

      if (index !== -1) {
        products.splice(index, 1);
        res.status(200).json({ message: "Product successfully deleted" });
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ error: "There was an error deleting the product" });
    }
  }
);

// Secure HTTPS server
https.createServer(options, app).listen(port, () => {
  console.log(`Order service running securely on port ${port}`);
});
