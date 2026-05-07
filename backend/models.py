from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    staff = "staff"
    admin = "admin"

class ProductStatus(str, enum.Enum):
    in_stock = "In Stock"
    low_stock = "Low Stock"
    out_of_stock = "Out of Stock"

class ProductCategory(str, enum.Enum):
    eliquid = "E-Liquid"
    disposables = "Disposables"
    hardware = "Hardware"
    accessories = "Accessories"

class DefectReason(str, enum.Enum):
    leaking = "Leaking"
    auto_firing = "Auto-firing"
    dead_battery = "Dead Battery"
    burnt_taste = "Burnt Taste"
    other = "Other"

class AuditAction(str, enum.Enum):
    product_added = "Product Added"
    product_edited = "Product Edited"
    stock_added = "Stock Added"
    defect_reported = "Defect Reported"
    defect_resolved = "Defect Resolved"
    sale_recorded = "Sale Recorded"
    user_created = "User Created"
    user_deactivated = "User Deactivated"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(100), nullable=False)
    email        = Column(String(150), unique=True, index=True, nullable=False)
    password     = Column(String(255), nullable=False)   # bcrypt hash
    role         = Column(Enum(UserRole), default=UserRole.staff, nullable=False)
    is_verified  = Column(Boolean, default=False)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    verification_codes = relationship("VerificationCode", back_populates="user", cascade="all, delete-orphan")
    audit_logs         = relationship("AuditLog", back_populates="user")
    sales              = relationship("Sale", back_populates="staff")


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    code       = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False)

    user = relationship("User", back_populates="verification_codes")


# ─── Product ──────────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id           = Column(Integer, primary_key=True, index=True)
    sku          = Column(String(50), unique=True, index=True, nullable=False)
    title        = Column(String(200), nullable=False)
    brand        = Column(String(100), nullable=False)
    flavor       = Column(String(100), nullable=True)
    category     = Column(String(50), nullable=False)           # allows custom values
    price        = Column(Float, nullable=False, default=0.0)
    stock        = Column(Integer, nullable=False, default=0)
    status       = Column(String(20), default=ProductStatus.in_stock)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    defective_items = relationship("DefectiveItem", back_populates="product")
    sale_items      = relationship("SaleItem", back_populates="product")
    audit_logs      = relationship("AuditLog", back_populates="product")


class DefectiveItem(Base):
    __tablename__ = "defective_items"

    id          = Column(Integer, primary_key=True, index=True)
    product_id  = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity    = Column(Integer, nullable=False, default=0)
    reason      = Column(String(100), nullable=False)           # allows custom values
    note        = Column(Text, nullable=True)
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved    = Column(Boolean, default=False)

    product = relationship("Product", back_populates="defective_items")


# ─── Sales ────────────────────────────────────────────────────────────────────

class Sale(Base):
    __tablename__ = "sales"

    id             = Column(Integer, primary_key=True, index=True)
    staff_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    subtotal       = Column(Float, nullable=False, default=0.0)
    discount       = Column(Float, nullable=False, default=0.0)   # percentage
    service_fee    = Column(Float, nullable=False, default=0.0)   # percentage
    tax            = Column(Float, nullable=False, default=0.0)   # percentage
    total          = Column(Float, nullable=False, default=0.0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    staff      = relationship("User", back_populates="sales")
    sale_items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id         = Column(Integer, primary_key=True, index=True)
    sale_id    = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    sku        = Column(String(50), nullable=False)     # snapshot at time of sale
    title      = Column(String(200), nullable=False)    # snapshot at time of sale
    quantity   = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    subtotal   = Column(Float, nullable=False, default=0.0)

    sale    = relationship("Sale", back_populates="sale_items")
    product = relationship("Product", back_populates="sale_items")


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_id  = Column(Integer, ForeignKey("products.id"), nullable=True)
    action      = Column(String(50), nullable=False)
    details     = Column(Text, nullable=True)   # JSON string of changed fields
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user    = relationship("User", back_populates="audit_logs")
    product = relationship("Product", back_populates="audit_logs")


# ─── Settings ─────────────────────────────────────────────────────────────────

class AppSettings(Base):
    __tablename__ = "app_settings"

    id                  = Column(Integer, primary_key=True, index=True)
    low_stock_threshold = Column(Integer, default=10)
    discount_pct        = Column(Float, default=0.0)
    service_fee_pct     = Column(Float, default=0.0)
    tax_pct             = Column(Float, default=0.0)
    currency            = Column(String(10), default="PHP")
    currency_symbol     = Column(String(5), default="₱")