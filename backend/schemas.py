from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProductBase(BaseModel):
    sku: str
    title: str
    brand: str
    flavor: str
    category: str
    price: float
    stock: int
    status: str = "In Stock"

class ProductCreate(ProductBase): pass
class ProductUpdate(ProductBase): pass

class DefectReport(BaseModel):
    quantity: int
    reason: str
    note: Optional[str] = None

class DefectUpdate(BaseModel):
    quantity: int

class BatchProduct(ProductBase): pass

class BatchAddRequest(BaseModel):
    items: List[BatchProduct]

class BatchDefectItem(BaseModel):
    product_id: int
    quantity: int
    reason: str
    note: Optional[str] = None

class BatchDefectRequest(BaseModel):
    items: List[BatchDefectItem]

class DefectResolve(BaseModel):
    action: str
    quantity: int