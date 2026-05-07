from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models
from routes import auth as auth_router
import os

# Create all DB tables on startup
models.Base.metadata.create_all(bind=engine)

# Seed default AppSettings if not present
def seed_settings():
    db = SessionLocal()
    try:
        if not db.query(models.AppSettings).first():
            db.add(models.AppSettings())
            db.commit()
    finally:
        db.close()

seed_settings()

app = FastAPI(title="KNE Vape Shop Inventory", version="1.0.0")

# Static files & templates
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(BASE_DIR, "..", "frontend")

app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(FRONTEND, "templates"))

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)


# ─── Page Routes ──────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def root():
    return RedirectResponse(url="/login")

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/verify", response_class=HTMLResponse)
def verify_page(request: Request):
    return templates.TemplateResponse("verify.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})