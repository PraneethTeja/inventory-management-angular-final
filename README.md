# Jewelry Shop Application

A full-stack web application for a jewelry store with WhatsApp integration for order processing.

## Features

- Admin dashboard for managing products and orders
- Customer-facing catalog for browsing jewelry items
- Shopping cart with pendant + chain combinations
- WhatsApp integration for order processing
- Responsive design built with Angular Material

## Tech Stack

### Frontend
- Angular 19.2.x
- Angular Material 19.2.x
- Reactive Forms
- Lazy-loaded Feature Modules
- SCSS for styling

### Backend
- Node.js v20.15.0 (supports v8.9.0 - v22.14.0)
- Express
- MongoDB
- JWT Authentication
- RESTful API Architecture
- npm 5.5.1

### Integration
- WhatsApp Business API (simulated in development)

## Version Requirements
This project is built with:
- **Angular**: v19.2.6
- **Node.js**: v20.15.0 recommended (v18.19 or later required for Angular CLI)
- **npm**: v5.5.1

## Getting Started

### Prerequisites
- Node.js (v18.19 or later recommended for Angular compatibility)
- MongoDB (local or Atlas)
- NPM or Yarn

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/jewelry-shop-app.git
cd jewelry-shop-app
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Install frontend dependencies
```
cd ../frontend
npm install
```

4. Set up environment variables
   - Create a `.env` file in the `backend` directory
   - Add the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/jewelry-shop
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   WHATSAPP_API_KEY=your_whatsapp_business_api_key
   WHATSAPP_PHONE_NUMBER=your_whatsapp_phone_number
   ```

### Running the Application

1. Start the backend server
```
cd backend
npm run dev
```

2. Start the frontend application
```
cd ../frontend
npm start
```

3. Access the application
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:5000/api

## Project Structure

```
jewelry-shop-app/
├── frontend/                # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/        # Core services, models, guards
│   │   │   ├── modules/     # Feature modules
│   │   │   ├── shared/      # Shared components
│   │   │   └── ...
│   │   ├── assets/          # Static assets
│   │   └── ...
│   └── ...
├── backend/                 # Express API server
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── config/          # Configuration
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Entry point
│   └── ...
└── README.md
```

## User Flows

### Normal User Flow
1. Browse products
2. Add items to cart (chains, pendants, or combinations)
3. Review cart and submit order
4. Redirected to WhatsApp to finalize order details and payment
5. Receive order updates via WhatsApp

### Admin User Flow
1. Login to admin dashboard
2. Create/manage products
3. Process and update order statuses
4. Track inventory and manage the catalog
5. View order analytics and reports

## API Endpoints

### Authentication
- POST /api/auth/login - User authentication
- POST /api/auth/register - Admin account creation
- GET /api/auth/me - Get current user profile

### Products
- GET /api/products - Get all products
- GET /api/products/:id - Get product by ID
- GET /api/products/featured - Get featured products
- GET /api/products/category/:category - Get products by category
- POST /api/products - Create product (admin only)
- PUT /api/products/:id - Update product (admin only)
- DELETE /api/products/:id - Delete product (admin only)

### Orders
- GET /api/orders - Get all orders (admin only)
- GET /api/orders/:id - Get order by ID (admin only)
- GET /api/orders/stats - Get order statistics (admin only)
- POST /api/orders - Create order (admin only)
- POST /api/orders/whatsapp - Create order via WhatsApp
- PUT /api/orders/:id/status - Update order status (admin only)
- PUT /api/orders/:id/whatsapp-status - Update WhatsApp status (admin only)

### WhatsApp
- POST /api/whatsapp/send-order - Send order details to WhatsApp
- POST /api/whatsapp/webhook - Webhook for WhatsApp message updates
- GET /api/whatsapp/redirect/:orderId - Generate WhatsApp redirect URL

## License

This project is licensed under the MIT License. 
