from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from backend.database import engine, Base
from backend.routers import auth
from backend.routers import auth, inventory
from backend.routers import sales

# Initialize DB models
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KNE Vape Shop API")

# Mount static and templates
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
templates = Jinja2Templates(directory="frontend/templates")

# Include Routers
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(sales.router)

# Frontend Routes
@app.get("/")
def read_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/login")
def read_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")

@app.get("/register")
def read_register(request: Request):
    return templates.TemplateResponse(request=request, name="register.html")

@app.get("/verify")
def read_verify(request: Request):
    return templates.TemplateResponse(request=request, name="verify.html")

@app.get("/inventory")
def read_inventory(request: Request):
    return templates.TemplateResponse(request=request, name="inventory.html")
    
# If you have these placeholder routes already, update them too:
@app.get("/dashboard")
def read_dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")

@app.get("/sales")
def read_sales(request: Request):
    return templates.TemplateResponse(request=request, name="sales.html")

@app.get("/reports")
def read_reports(request: Request):
    return templates.TemplateResponse(request=request, name="reports.html")