# 💨 KNE Vape Shop | Inventory & POS System

A full-stack Point of Sale (POS) and Inventory Management web application designed specifically for KNE Vape Shop. It features real-time inventory tracking, defect logging, role-based access control, and dynamic financial reporting dashboards.

---

# ✨ Key Features

- Point of Sale (POS)
  - Fast and interactive cart system
  - Global discounts support
  - Automatic tax calculation
  - Real-time stock deduction after checkout

- Smart Inventory Management
  - Track stock levels in real time
  - Batch-add products
  - Automatic low-stock alerts
  - Product quantity monitoring

- Loss Tracking (Defects)
  - Log defective items (leaks, dead batteries, damaged packaging, etc.)
  - Permanently write off defective inventory
  - Restore mistakenly flagged defective items back into stock

- Interactive Reports Dashboard
  - Real-time Chart.js visualizations
  - Inventory distribution analytics
  - Inventory health assessment
  - Gross revenue tracking
  - Sales performance monitoring

- Role-Based Access Control (RBAC)
  - Separate Admin and Staff access
  - Staff restrictions for sensitive financial data
  - Secure dashboard permissions
  - Protected store settings

- Responsive User Interface
  - Dark-mode first design
  - Mobile-friendly layout
  - Clean modern interface
  - Built using lightweight frontend technologies

---

# 🛠️ Tech Stack

## Backend
- Python
- FastAPI
- SQLAlchemy (ORM)
- Uvicorn

## Database
- SQLite (Default Database)

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Jinja2 Templates

## Libraries & Tools
- Chart.js (Data Visualization)
- Python-JOSE (JWT Authentication)
- Passlib (Password Hashing)
- Python-Dotenv (.env configuration)

---

# 🚀 How to Run the App From Scratch

Follow the steps below to properly set up and run the application locally.

---

# 1️⃣ Prerequisites

Make sure you have the following installed:

- Python 3.8 or higher
- pip (Python package manager)

Download Python here:

> https://www.python.org/downloads/

---

# 2️⃣ Open in code editor

Better to use VS Code. Open a new terminal and move on with the steps.

---

# 3️⃣ Create a Virtual Environment (Recommended)

A virtual environment keeps project dependencies isolated.

## Windows

=============================================================================
> python -m venv venv
> venv\Scripts\activate
=============================================================================

## Mac/Linux

=============================================================================
> python3 -m venv venv
> source venv/bin/activate
=============================================================================

---

# 4️⃣ Install Dependencies

Install all required Python packages.

=============================================================================
> pip install -r requirements.txt
> pip install "bcrypt<4.0.0"
=============================================================================

---

# 5️⃣ Create the Environment Variables File

Create a `.env` file in the root directory.
Copy the `.env example` and rename it to `.env`
Example:

=============================================================================
DATABASE_URL=sqlite:///./kne_inventory.db
SECRET_KEY=change-this-to-a-super-secret-key-in-production <---- CHANGE THIS
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

GMAIL_ADDRESS=your.shop.email@gmail.com <---- CHANGE THIS
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx <---- CHANGE THIS
ADMIN_PASSCODE=123ADMIN
APP_NAME=KNE Vape Shop
LOW_STOCK_THRESHOLD=10
=============================================================================

---

# 6️⃣ Start the FastAPI Server

Run the application using Uvicorn. 
Since `main.py` is inside the `backend` folder, use:

=============================================================================
> uvicorn backend.main:app --reload
=============================================================================

---

# 7️⃣ Open the Application

Once the server is running, open your browser and go to:

=============================================================================
http://localhost:8000
=============================================================================

---

# 🗄️ Database Initialization

On first startup:

- SQLAlchemy automatically creates the SQLite database
- Database tables are automatically generated
- The database file will appear as:
"kne_inventory.db"


No manual database setup is required.

You can seed sample data by running:
=============================================================================
> python seed.py
=============================================================================

---

# 🔐 Authentication & Roles

## User Registration

Register a new account through:

=============================================================================
http://localhost:8000/register
=============================================================================

## Default Roles

The system supports:

### Admin
- Full system access
- View financial reports
- Manage users
- Access sales settings

### Staff
- Inventory access
- POS access
- Limited reporting access
- Limited financial visibility

---

# 📊 Reports & Analytics

The Reports Dashboard includes:

- Revenue charts
- Product stock analytics
- Inventory health metrics
- Low-stock monitoring
- Sales summaries
- Defect tracking

---

# 🔒 Security Features

- JWT Authentication
- Password Hashing using Passlib + Bcrypt
- Protected Routes
- Role-Based Access Control
- Secure Login System

---

# 📱 UI Features

- Responsive layout
- Dark mode interface
- Mobile-friendly design
- Modern dashboard styling
- Lightweight frontend architecture

---

# 🧪 Development Notes

## Recommended Development Workflow

Run the server with:

=============================================================================
> uvicorn main:app --reload
=============================================================================

This enables:

- Automatic server reload
- Faster development
- Real-time code updates

---

# 📦 Future Improvements

Potential future features:

- Barcode Scanner Support
- Receipt Printing
- Multi-Branch Support
- Supplier Management
- Sales Forecasting
- SMS/Email Notifications
- Backup & Restore System
- Export Reports to Excel/PDF

---

# 👨‍💻 Developer Notes

This project was designed for educational and small-business operational purposes.

Main goals:
- Simple deployment
- Lightweight architecture
- Easy customization
- Fast local performance

---

# 📄 License

This project is for educational and internal business use.

---

# ❤️ Built For

KNE Vape Shop Inventory & POS Operations