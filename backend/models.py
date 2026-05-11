from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(String(50), default="staff") # 'admin' or 'staff'
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String(255), nullable=True)
    code_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True)
    title = Column(String(255))
    brand = Column(String(100))
    flavor = Column(String(100))
    category = Column(String(100))
    price = Column(Float)
    stock = Column(Integer, default=0)
    status = Column(String(50), default="In Stock")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class DefectiveItem(Base):
    __tablename__ = "defective_items"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    reason = Column(String(255))
    note = Column(String(255), nullable=True)
    reported_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Float)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    service_fee = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price_at_time = Column(Float)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    action = Column(String(255))
    target = Column(String(255))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class StoreSettings(Base):
    __tablename__ = "store_settings"
    id = Column(Integer, primary_key=True, index=True)
    global_discount = Column(Float, default=0.0)
    global_tax = Column(Float, default=0.0)
    service_fee = Column(Float, default=0.0)