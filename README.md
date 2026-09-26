# 💰 Expense Tracker App

A full-stack MERN (MongoDB, Express, React, Node.js) web application for tracking personal expenses, categorizing spending, setting budgets, and getting savings insights.

## 🎯 Features

- ✅ **User Authentication** - Secure registration and login with JWT
- ✅ **Expense Tracking** - Add, edit, and delete expenses with categories
- ✅ **Category Management** - 8 pre-defined expense categories
- ✅ **Real-time Dashboard** - View total expenses, transaction count, and averages
- ✅ **Smart Analytics**
  - Pie charts and bar charts for expense visualization
  - Category-wise spending breakdown
  - Monthly expense summaries
- ✅ **Budget Management** - Set spending limits for each category
- ✅ **Savings Insights**
  - Personalized recommendations to reduce spending
  - Budget overspend warnings
  - Top spending categories analysis
  - Potential savings calculations
- ✅ **Export Function** - Download expense data as CSV
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile

## 📦 Tech Stack

**Backend:**
- Node.js & Express.js
- MongoDB
- JWT for authentication
- bcryptjs for password hashing

**Frontend:**
- React 18
- Vite
- Chart.js for data visualization
- Axios for API calls
- React Router for navigation

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or cloud instance)
- npm

### 1. Clone/Extract the project
```bash
cd Project1
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (already created, verify MongoDB URI)
# Default: mongodb://localhost:27017/expense-tracker

# Start the server
npm run dev
# Server will run on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
# App will be available at http://localhost:3000
```

## 📝 Usage Guide

### 1. **Register/Login**
   - Create a new account with email and password
   - Or login with existing credentials

### 2. **Add Expenses**
   - Go to "Add Expense" tab
   - Enter description, amount, category, and date
   - Add optional notes
   - Click "Add Expense"

### 3. **View Expenses**
   - Go to "Overview" tab to see all expenses
   - Filter by category
   - Sort by date, amount, or category
   - Delete expenses if needed
   - Export to CSV for records

### 4. **Analytics & Insights**
   - Go to "Analytics" tab
   - View spending breakdown with pie and bar charts
   - Select time range (1, 3, 6, or 12 months)
   - See top spending categories
   - Get personalized money-saving recommendations
   - View budget overspend warnings

## 🏗️ Project Structure

```
Project1/
├── backend/
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── middleware/       # Authentication middleware
│   ├── server.js         # Main server file
│   ├── .env              # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── api.js        # API calls
│   │   ├── App.jsx       # Main app
│   │   └── main.jsx      # Entry point
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## 📚 Documentation

- **`BACKEND_ROUTING.md`** — how routing works: the 6 route groups, all 25 endpoints, the JWT auth middleware, the thin-route pattern, and how to add a new endpoint
- **`FRONTEND_ARCHITECTURE.md`** — how the React app is built: boot sequence, state & props, the `api.js` network layer, the 5 feature components, theming, and how a click reaches the backend

## 📊 Expense Categories

- 🍔 Food
- 🚗 Transport
- 🎬 Entertainment
- 💡 Utilities
- 🏥 Healthcare
- 🛍️ Shopping
- 📚 Education
- 📌 Other

## 💡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/budget/set` - Set budget for category
- `GET /api/expenses/budget/get` - Get all budgets

### Analytics
- `GET /api/analytics/monthly-summary` - Get monthly expense summary
- `GET /api/analytics/category-breakdown` - Get spending by category
- `GET /api/analytics/savings-insights` - Get savings recommendations
- `GET /api/analytics/export/csv` - Export expenses as CSV

## 🔐 Security

- Passwords are hashed using bcryptjs
- JWT tokens for API authentication
- Token stored in localStorage (consider secure storage in production)
- Private routes protected by authentication middleware

## 💾 Data Persistence

All data is stored in MongoDB:
- User accounts and authentication
- Expense records
- Budget settings
- Full expense history for analytics

## 🎨 Customization

### Change Theme Colors
Edit `frontend/src/App.css` and component CSS files
- Primary color: `#667eea`
- Secondary color: `#764ba2`

### Add More Categories
Edit `backend/models/Expense.js` enum values and `frontend/components/ExpenseForm.jsx`

### Modify Budget Limits
Edit the budget setting logic in `backend/routes/expenses.js`

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running locally: `mongod`
- Or update MONGODB_URI in `.env` for cloud MongoDB

### CORS Issues
- Ensure backend runs on port 5000
- Frontend proxy is configured in `vite.config.js`

### Port Already in Use
- Change PORT in `backend/.env` or `frontend/vite.config.js`

## 📈 Future Enhancements

- [ ] Recurring expense tracking
- [ ] Multiple user support (family/couples)
- [ ] Push notifications for budget alerts
- [ ] Mobile app version
- [ ] Advanced filtering and search
- [ ] Expense forecasting
- [ ] Integration with banking APIs

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Support

For issues or suggestions, feel free to open an issue or contact the development team.

---

**Happy Tracking! 🎉 Start managing your finances smartly today!**
