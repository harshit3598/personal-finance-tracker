# 🚀 Quick Start Guide for Expense Tracker

## Step 1: Install Dependencies

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
cd ../frontend
npm install
```

## Step 2: Start MongoDB

**Option A: Local MongoDB**
```bash
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Update `MONGODB_URI` in `backend/.env` with your connection string
- Example: `mongodb+srv://username:password@cluster.mongodb.net/expense-tracker`

## Step 3: Run the Application

### Terminal 1 - Start Backend Server
```bash
cd backend
npm run dev
# Server will run on http://localhost:5000
```

### Terminal 2 - Start Frontend App
```bash
cd frontend
npm run dev
# App will run on http://localhost:3000
```

## Step 4: Access the App

Open your browser and go to: **http://localhost:3000**

## 🎬 Getting Started

1. **Register an Account**
   - Click "Register"
   - Enter your name, email, and password
   - Click "Register" button

2. **Login**
   - Enter your email and password
   - Click "Login"

3. **Add Your First Expense**
   - Click "Add Expense" tab
   - Fill in the form:
     - Description: What did you spend on?
     - Amount: How much?
     - Category: What category?
     - Date: When?
     - Notes: (Optional)
   - Click "Add Expense"

4. **View Your Expenses**
   - Click "Overview" tab
   - See all your expenses in a table
   - Filter by category
   - Sort by date, amount, or category
   - Export to CSV if needed

5. **Get Financial Insights**
   - Click "Analytics" tab
   - View pie and bar charts
   - See top spending categories
   - Get money-saving tips
   - View potential savings opportunities

## 🛠️ Troubleshooting

### "Cannot find module" error
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### MongoDB connection failed
- Check if MongoDB is running
- Verify MongoDB connection string in `.env`
- Try restarting MongoDB

### Port already in use
- Change PORT in `backend/.env` to 5001
- Or kill the process using the port

### CORS error
- Ensure backend is running on port 5000
- Ensure frontend is running on port 3000

## 📱 Features to Try

✅ Track multiple expenses across different categories
✅ View spending patterns with interactive charts
✅ Get personalized savings recommendations
✅ Export all expenses as CSV
✅ Filter expenses by category and date
✅ See average spending and totals
✅ Monitor budget status

## 🔒 Default Test Account

```
Email: test@example.com
Password: test123
```

(Create your own account instead for production use)

## 📚 Environment Variables

**Backend `.env` file:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

**Frontend** uses API proxy configured in `vite.config.js`

## 🎯 Next Steps

- Add more expenses to see analytics
- Set budgets for different categories
- Review the CSV export feature
- Customize the app (colors, categories, etc.)
- Deploy to production when ready

## 📞 Need Help?

Check the main [README.md](../README.md) for more detailed information!

---

**Enjoy tracking your expenses! 💰**
