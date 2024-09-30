# Shopify Dashboard

## Architecture

This project is a full-stack application with a React frontend (built with Vite), a Node.js backend, and a MongoDB database. It provides a dashboard for Shopify store owners to view their store's performance metrics and recent orders.

### Frontend
- Built with React and TypeScript
- Uses Vite as the build tool and development server
- Uses React Router for navigation
- Styled with Tailwind CSS
- Utilizes shadcn/ui for UI components
- Uses Axios for API calls
- Charts created with Recharts

### Backend
- Node.js server (Express.js assumed)
- Connects to Shopify API to fetch store data
- Uses JWT for authentication
- Integrates with MongoDB for data persistence

### Database
- MongoDB for storing user information

## Setup and Running the Project

### Prerequisites
- Node.js (v14 or later recommended)
- npm or yarn
- MongoDB (v4.4 or later)
- A Shopify store and API credentials

### Database Setup
1. Install MongoDB on your system if not already installed
2. Start the MongoDB service
3. Create a new database for the project (e.g., `shopify_dashboard`)

### Backend Setup
1. Navigate to the server directory:
   ```
   cd server
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=8000
   JWT_SECRET=your_jwt_secret
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_API_SECRET=your_shopify_api_secret
   MONGODB_URI=mongodb://localhost:27017/shopify_dashboard
   ```
4. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the client directory:
   ```
   cd client
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the Vite development server:
   ```
   npm run dev
   ```

The application should now be running on `http://localhost:5173`.

## Tailwind CSS and shadcn/ui Setup

This project uses Tailwind CSS for styling and shadcn/ui for UI components. They are already configured in the project, but if you need to set them up in a new project:

1. Install Tailwind CSS:
   ```
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. Configure Tailwind CSS by updating the `tailwind.config.js` file.

3. Install and configure shadcn/ui components as needed:
   ```
   npx shadcn-ui@latest init
   ```

4. Add desired components:
   ```
   npx shadcn-ui@latest add button
   ```

Refer to the shadcn/ui documentation for more details on using and customizing components.

## Assumptions

1. The backend is built with Express.js and uses JWT for authentication.
2. MongoDB is used to store user information and.
3. The Shopify API is used to fetch store data.
4. The login/signup page is located at the root route ('/').
5. The dashboard is protected and requires authentication to access.
6. The project uses environment variables for sensitive information.
7. The frontend and backend are in separate directories within the same repository.
8. Vite is used as the build tool and development server for the frontend.
9. Tailwind CSS is used for styling, and shadcn/ui is used for UI components.
10. The chart data (sales by time of day) is preprocessed on the backend.
11. Error handling includes redirecting to the login page for authentication errors.
12. The dashboard auto-refreshes every 5 minutes.
13. Mongoose is used as an ODM (Object Document Mapper) for MongoDB interactions.

## Database Schema

The MongoDB database includes the following main collections:

1. `users`: Stores user authentication information
   - Fields: username, email, password (hashed), createdAt, updatedAt


## Additional Notes

- Ensure all required environment variables are set before running the application.
- The project assumes a certain structure for the Shopify data. Adjust the data processing logic if your Shopify store data differs.
- This README assumes a basic familiarity with React, Vite, Node.js, npm, and MongoDB. Additional setup steps may be necessary depending on your development environment.
- Regularly backup your MongoDB database to prevent data loss.
- Consider implementing data refresh mechanisms to keep the cached Shopify data up-to-date.
- When adding new shadcn/ui components, make sure to follow their documentation for proper integration with Tailwind CSS.
