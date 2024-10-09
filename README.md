# 3103_Microservices Exercise 
Created by:
- Ralph Miguel Mandigma
- Kyle Tubod 

## Project Overview

This project demonstrates a simple microservice involving three independent microservices:
- **Product Service**: Handles product-related data.
- **Customer Service**: Handles customer-related data.  
- **Order Service**: Handles order-related data and communicates with the other services to validate customers and products.

## API Endpoints
1. **Product Service**
	-   **POST /products**: Add a new product.  
	-   **GET /products/:productId**: Get product details by ID.  
	-   **PUT /products/:productId**: Update a product.  
	-   **DELETE /products/:productId**: Delete a product.  
2. **Customer Service**
	-   **POST /customers**: Add a new customer.  
	-   **GET /customers/:customerId**: Get customer details by ID.  
	-   **PUT /customers/:customerId**: Update customer information.  
	-   **DELETE /customers/:customerId**: Delete a customer.  
3. **Order Service**
	-   **POST /orders**: Create a new order. This service will:  
		- Verify that the customer exists by communicating with the Customer Service.  
		-   Verify that the product exists by communicating with the Product Service.  
		-   Create the order only if the customer and product are valid.  
	-   **GET /orders/:orderId**: Get order details.  
	-   **PUT /orders/:orderId**: Update an order.  
	-   **DELETE /orders/:orderId**: Delete an order.


## Project Setup
1. Clone the repository
```
git clone https://github.com/KKudas/3103_Microservices.git  
```
2. CD into root folder
```
cd 3103_microservices  
```
3. Install node dependency
```
npm install  
```
4. Run each API on different terminals
```
node product-service.js
```
```
node customer-service.js 
```
```
node order-service.js
```
