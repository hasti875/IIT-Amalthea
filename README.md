💼 Expense Reimbursement System

A simple platform to manage employee expenses, approvals, and reimbursements — faster, error-free, and transparent.

🔍 What’s the Problem?

Many companies still use manual processes for expense approvals. These are:

- Slow and time-consuming  
- Prone to human errors  
- Not transparent  

This system helps by automating expense submissions and approvals with smart rules.

🚀 What Can It Do?

👥 User & Company Setup

- When someone signs up, a new **Company** and **Admin User** are auto-created.
- The company’s currency is set based on the selected country.
- Admin can:
  - Add employees and managers
  - Assign roles (Employee, Manager)
  - Link employees to their managers

🧾 Expense Submission (Employee)

Employees can:

- Submit expenses (with date, amount, description, etc.)
- Upload receipts (auto-filled using OCR)
- Check their past expenses and approval status

✅ Approval Flow (Manager/Admin)

- Multi-step approvals: Manager → Finance → Director, etc.
- Admin sets the approval sequence
- Each approver can:
  - View pending requests
  - Approve or reject with comments

⚙️ Smart Approval Rules

Approval logic can include:

- ✅ **Percentage Rule** – e.g., if 60% approve, it's accepted
- 👤 **Specific Approver Rule** – e.g., if CFO approves, it's auto-approved
- 🧠 **Hybrid Rule** – e.g., 60% OR CFO approval

Supports mixing these rules with multiple approvers.


📸 Receipt OCR (Auto-Read)

- Upload a photo of the receipt  
- System auto-fills:
  - Amount
  - Date
  - Vendor name (e.g., restaurant)
  - Description
  - Expense type



🔐 User Roles

| Role     | What They Can Do                               |
|----------|------------------------------------------------|
| Admin    | Add users, assign roles, set rules, view all expenses |
| Manager  | Approve/reject team expenses                   |
| Employee | Submit expenses, view their own submissions    |


🌍 APIs Used

- 🌐 **Country & Currency**  
  [https://restcountries.com/v3.1/all?fields=name,currencies](https://restcountries.com/v3.1/all?fields=name,currencies)

- 💱 **Currency Conversion**  
  [https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}](https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY})

🖼️ UI Mockup

View the interface design here:  
🔗 [Excalidraw Mockup](https://link.excalidraw.com/l/65VNwvy7c4X/4WSLZDTrhkA)


🗂️ Project Structure 

/frontend → Web interface
/backend → Server & APIs
/ocr-service → OCR for receipts
/docs → API & system docs
README.md → This file


Team Members :
Ekta Dodiya 
Meghansh Thakker
Hasti Kalariya
Jainam Patel
