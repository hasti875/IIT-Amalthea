# Project Structure Documentation

## Overview
This is a complete MERN stack expense reimbursement system with the following structure:

```
amalthea/
├── backend/                    # Node.js/Express Backend
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   │   ├── authController.js
│   │   │   └── expenseController.js
│   │   ├── models/            # MongoDB Schemas
│   │   │   ├── User.js
│   │   │   ├── Company.js
│   │   │   ├── Expense.js
│   │   │   ├── ApprovalRule.js
│   │   │   └── Currency.js
│   │   ├── routes/            # API Routes
│   │   │   ├── authRoutes.js
│   │   │   ├── expenseRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── companyRoutes.js
│   │   │   ├── approvalRoutes.js
│   │   │   └── currencyRoutes.js
│   │   ├── middleware/        # Express Middleware
│   │   │   ├── authMiddleware.js
│   │   │   ├── errorHandler.js
│   │   │   └── uploadMiddleware.js
│   │   ├── services/          # Business Logic
│   │   │   ├── ocrService.js
│   │   │   └── currencyService.js
│   │   └── utils/             # Utilities
│   │       └── seedCurrencies.js
│   ├── uploads/               # File Storage
│   ├── package.json
│   ├── server.js             # Entry Point
│   └── .env.example          # Environment Template
├── frontend/                  # React/TypeScript Frontend
│   ├── src/
│   │   ├── components/        # UI Components
│   │   │   ├── Layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   └── AppSidebar.tsx
│   │   │   └── ui/           # Shadcn/ui Components
│   │   ├── pages/            # Application Pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── SubmitExpense.tsx
│   │   │   ├── MyExpenses.tsx
│   │   │   ├── TeamExpenses.tsx
│   │   │   ├── AllExpenses.tsx
│   │   │   ├── Approvals.tsx
│   │   │   ├── ApprovalRules.tsx
│   │   │   └── Employees.tsx
│   │   ├── contexts/          # React Contexts
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/            # Custom Hooks
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-toast.ts
│   │   └── lib/              # Utilities
│   │       └── utils.ts
│   ├── public/               # Static Files
│   ├── package.json
│   └── vite.config.ts
├── README.md                 # Project Documentation
├── setup.bat                 # Windows Setup Script
└── setup.sh                  # Unix Setup Script
```

## Key Components

### Backend Architecture

#### Models (Database Schemas)
- **User.js**: User management with roles (admin, manager, employee)
- **Company.js**: Company settings and currency configuration
- **Expense.js**: Expense data with OCR integration and approval flow
- **ApprovalRule.js**: Configurable approval workflows
- **Currency.js**: Currency and exchange rate management

#### Controllers (Business Logic)
- **authController.js**: Authentication, registration, profile management
- **expenseController.js**: Expense CRUD operations and submission workflow

#### Services (External Integrations)
- **ocrService.js**: Receipt OCR processing using Tesseract.js
- **currencyService.js**: Real-time currency conversion via APIs

#### Middleware
- **authMiddleware.js**: JWT authentication and role-based authorization
- **uploadMiddleware.js**: File upload handling with validation
- **errorHandler.js**: Centralized error handling

### Frontend Architecture

#### Pages (Main Views)
- **Login.tsx**: Authentication interface
- **Dashboard.tsx**: Role-based dashboard
- **SubmitExpense.tsx**: Expense submission with OCR
- **MyExpenses.tsx**: Employee expense tracking
- **Approvals.tsx**: Manager approval interface
- **Employees.tsx**: Admin user management

#### Components
- **Layout/**: Application shell and navigation
- **ui/**: Reusable UI components (Shadcn/ui)

#### Contexts & Hooks
- **AuthContext.tsx**: Global authentication state
- **Custom hooks**: Reusable component logic

## Workflow Implementation

### 1. Authentication Flow
```
Registration → Company Creation → Admin Role Assignment → JWT Token
Login → JWT Validation → Role-based Dashboard
```

### 2. Expense Submission Flow
```
Upload Receipt → OCR Processing → Auto-fill Form → Manual Review → Submit
Currency Conversion → Approval Rule Matching → Workflow Generation
```

### 3. Approval Workflow
```
Rule Engine → Multi-level Routing → Manager Notifications → 
Approval Decision → Status Update → Employee Notification
```

### 4. Admin Management Flow
```
User Creation → Role Assignment → Manager Relationships →
Approval Rules → System Configuration
```

## Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM
- **JWT**: Authentication
- **Multer**: File uploads
- **Tesseract.js**: OCR processing
- **Axios**: HTTP client for APIs

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Shadcn/ui**: Component library
- **React Router**: Navigation
- **React Hook Form**: Form management
- **React Query**: Data fetching

### DevOps & Tools
- **MongoDB**: Database
- **Cloudinary**: Image storage (optional)
- **External APIs**: Currency conversion
- **JWT**: Secure authentication

## Setup Instructions

### Prerequisites
1. Node.js (v16+)
2. MongoDB (v4.4+)
3. Git

### Quick Start
```bash
# Clone repository
git clone <repo-url>
cd amalthea

# Run setup script
# Windows:
setup.bat

# Unix/Mac:
chmod +x setup.sh
./setup.sh

# Start MongoDB
mongod

# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

### Manual Setup
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## Environment Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-reimbursement
JWT_SECRET=your-secure-secret
JWT_EXPIRE=30d
EXCHANGE_RATE_API_KEY=your-api-key
```

### Frontend (Optional .env)
```env
VITE_API_URL=http://localhost:5000/api
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Company registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Expense Endpoints
- `GET /api/expenses` - Get user expenses
- `POST /api/expenses` - Create expense (with file upload)
- `POST /api/expenses/:id/submit` - Submit for approval
- `GET /api/expenses/pending-approval` - Get pending approvals

### Admin Endpoints
- `GET /api/users` - Get company users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user

## Features Implementation Status

### ✅ Completed
- Backend API structure
- Authentication system
- Database models
- Expense creation and submission
- OCR integration
- Currency conversion
- File upload handling
- Role-based authorization

### 🚧 In Progress
- Approval workflow engine
- Frontend UI components
- Dashboard implementations

### 📝 Planned
- Email notifications
- Admin approval rules UI
- Advanced analytics
- Mobile optimization
- Production deployment

## Security Implementation

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- File upload validation
- Rate limiting
- CORS protection
- Input validation and sanitization

This structure provides a solid foundation for a comprehensive expense reimbursement system with all the features outlined in your requirements.