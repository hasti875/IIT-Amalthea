💸 Expense Reimbursement Management System (MERN Stack)

A comprehensive expense reimbursement platform that simplifies the process of expense submission, approval, and management for organizations.
Built with a modern MERN + TypeScript stack, it provides a seamless experience for employees, managers, and admins.

🚀 Problem Statement

Managing expense reimbursements is often time-consuming, error-prone, and lacks transparency.
Employees struggle with submissions, managers face approval bottlenecks, and finance teams deal with compliance overhead.

✅ Our Solution

The Expense Reimbursement Management System automates the entire workflow:

Employees can submit expenses (with receipt uploads & OCR support).

Managers review & approve reimbursements with hierarchical workflows.

Companies gain real-time visibility into spending with analytics and reporting.

🔑 Features
👥 User & Company Management

🔐 Authentication & Role-Based Access: Admin, Manager, and Employee roles.

🏢 Company Auto-Creation: New companies created during signup with base currency.

📊 Manager Relationships: Define reporting hierarchies for multi-level approvals.

💵 Expense Management

🧾 Submit Expenses with receipts (OCR-enabled for auto-data extraction).

🔄 Approval Workflows: Multi-level, rule-based approvals.

💱 Multi-Currency Support with automatic base-currency conversion.

📂 Expense Tracking: View status (Pending, Approved, Reimbursed).

📊 Analytics & Reporting

📈 Dashboard with expense summaries per employee, department, or company.

🗓️ Time-based filtering & reports (weekly, monthly, yearly).

🔍 Search & filter by category, employee, or status.

🔒 Security

✅ JWT Authentication & bcrypt password hashing.

✅ Helmet, rate limiting, and secure CORS policies.

✅ Role-based authorization for endpoints.

🖥️ Tech Stack

Frontend

⚡ Vite
 + React
 + TypeScript

🎨 Tailwind CSS
 + shadcn/ui

Backend

🟢 Node.js
 + Express

📦 REST API with modular controllers & services

🔒 JWT authentication, role-based middleware

Database

🍃 MongoDB
 + Mongoose

Other

☁️ File Uploads (ready for cloud storage e.g. AWS S3)

🖼️ OCR Integration for receipt scanning

📊 Seed scripts for currencies & initial setup

📸 Screenshots (Add Images Here)

Replace with actual screenshots/GIFs of your app for maximum impact.

🏠 Dashboard Overview

💵 Submit Expense Form

✅ Approval Workflow Screen

📊 Reports & Analytics

⚙️ Getting Started
🔹 Prerequisites

Node.js (use nvm to manage versions)

npm or yarn

MongoDB (local or cloud, e.g. Atlas)

🔹 Installation
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env   # update values inside

# Run development server
npm run dev

🌐 Deployment
With Lovable

Open your Lovable project.

Go to Share → Publish.

Your app is instantly live.

Custom Domain

Go to Project > Settings > Domains

Click Connect Domain and follow instructions.

📌 Roadmap

📲 Mobile-friendly PWA version

🔔 Email & push notifications for approvals

📑 PDF export of reports & receipts

💳 Integration with accounting/payroll systems

🤝 Contributing

Contributions are welcome!

Fork the repo

Create a new branch (feature/my-feature)

Submit a pull request

📜 License

MIT License © 2025 Expense Reimbursement Management System
