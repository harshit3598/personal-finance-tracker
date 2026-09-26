# 🚀 AI Categorizer - Quick Start (5 minutes)

## ⚡ TL;DR Setup

### 1. Get OpenAI API Key (2 min)
```bash
# Go to: https://platform.openai.com/account/api-keys
# Create new secret key
# Copy the key (sk-...)
```

### 2. Update Backend Config (1 min)
```bash
# Edit: backend/.env
# Add this line:
OPENAI_API_KEY=sk-your_key_here
```

### 3. Install OpenAI Package (1 min)
```bash
cd backend
npm install openai
```

### 4. Start Services (1 min)
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2  
cd frontend
npm run dev
```

### 5. Test It! (0 min)
1. Go to http://localhost:3000
2. Login
3. Go to "Add Expense"
4. Enter: "Starbucks Coffee" and "5.50"
5. Click 🤖 AI button
6. Watch it categorize!

---

## ✨ What You Get

- 🤖 **AI Button** in expense form
- 📊 **Smart Categorization** based on description + amount
- 💡 **Confidence Scores** show how sure the AI is
- ⚡ **Auto-fill** categories if confidence > 85%

---

## 📝 What Was Built

**Backend:**
- ✅ `backend/services/aiService.js` - AI Logic
- ✅ `backend/routes/ai.js` - API Endpoints
- ✅ Updated `backend/server.js` - Registered routes
- ✅ Updated `backend/.env` - API key config

**Frontend:**
- ✅ Enhanced `ExpenseForm.jsx` - Added AI button
- ✅ Updated `api.js` - Added AI API calls
- ✅ Updated `Components.css` - Styled AI button

---

## 🎯 How to Use

```
1. Enter expense description (e.g., "Uber to Airport")
2. Enter amount (e.g., 25.50)
3. Click 🤖 AI button
4. Review AI suggestion
5. Click "Add Expense"
```

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| "AI Service not responding" | Check OPENAI_API_KEY in .env |
| "403 Forbidden" | Get new API key from OpenAI |
| "Network Error" | Restart backend on port 8000 |
| "JSON Parse Error" | Clear browser cache & restart |

---

## 📚 Want to Learn More?

Read the full guide: [AI_SETUP_GUIDE.md](./AI_SETUP_GUIDE.md)

Covers:
- Deep dive into AI Agent concepts
- How the categorization flow works
- Frontend/Backend architecture
- Next enhancement ideas
- API reference

---

**That's it! You're ready to go.** 🎉
