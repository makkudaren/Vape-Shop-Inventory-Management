# backend/routers/sales.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from backend.database import get_db
from backend.models import Product, Sale, SaleItem, User, AuditLog
from backend.schemas import CheckoutRequest
from backend.utils.security import get_current_user

from backend.models import StoreSettings
from backend.schemas import StoreSettingsUpdate

router = APIRouter(prefix="/api/sales", tags=["sales"])

@router.post("/checkout")
def process_checkout(data: CheckoutRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not data.items:
        raise HTTPException(status_code=400, detail="Cart is empty.")
        
    total_amount = 0.0
    sale_items_db = []
    
    # 1. Pre-validate stock and calculate subtotal
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product not found.")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.title}. Only {product.stock} left.")
            
        # Deduct stock
        product.stock -= item.quantity
        product.status = "Out of Stock" if product.stock == 0 else "Low Stock" if product.stock <= 10 else "In Stock"
        
        line_total = product.price * item.quantity
        total_amount += line_total
        
        sale_items_db.append(SaleItem(
            product_id=product.id,
            quantity=item.quantity,
            price_at_time=product.price
        ))
        
    # 2. Apply fees and discounts
    final_total = total_amount - data.discount + data.tax + data.service_fee
    if final_total < 0: final_total = 0.0
        
    # 3. Create the Sale Record
    new_sale = Sale(
        user_id=current_user.id,
        total_amount=final_total,
        discount=data.discount,
        tax=data.tax,
        service_fee=data.service_fee
    )
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    
    # 4. Save the individual items
    for si in sale_items_db:
        si.sale_id = new_sale.id
        db.add(si)

        product = db.query(Product).filter(Product.id == si.product_id).first()
        product_name = product.title if product else "Unknown Product"
        
        item_audit = AuditLog(
            user_id=current_user.id,
            product_id=si.product_id,
            action=f"Sold {si.quantity} unit(s) of {product_name} (Sale #{new_sale.id})",
            target="INVENTORY"
        )
        db.add(item_audit)
        
    # 5. Log it for the Audit Trail
    audit = AuditLog(
        user_id=current_user.id,
        action=f"Processed Sale #{new_sale.id} ({len(data.items)} unique items)",
        target="SALES"
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Transaction successful!", "sale_id": new_sale.id}


@router.get("/history")
def get_sales_history(page: int = Query(1, ge=1), limit: int = Query(20, le=10000), db: Session = Depends(get_db)):
    sales_query = db.query(Sale).order_by(desc(Sale.created_at))
    total = sales_query.count()
    sales = sales_query.offset((page - 1) * limit).limit(limit).all()
    
    result = []
    for s in sales:
        user = db.query(User).filter(User.id == s.user_id).first()
        items = db.query(SaleItem).filter(SaleItem.sale_id == s.id).all()
        
        item_details = []
        for i in items:
            product = db.query(Product).filter(Product.id == i.product_id).first()
            item_details.append({
                "title": product.title if product else "Deleted Product",
                "qty": i.quantity,
                "price": i.price_at_time
            })
            
        result.append({
            "id": s.id,
            "cashier": user.name if user else "Unknown",
            "total": s.total_amount,
            "discount": s.discount,
            "date": s.created_at,
            "items": item_details
        })
        
    return {"total": total, "page": page, "pages": (total + limit - 1) // limit, "data": result}

# ── Store Settings Routes ──────────────────────────────────
@router.get("/settings")
def get_store_settings(db: Session = Depends(get_db)):
    settings = db.query(StoreSettings).first()
    # If no settings exist yet, create a default row!
    if not settings:
        settings = StoreSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    return {
        "discount": settings.global_discount, 
        "tax": settings.global_tax, 
        "service_fee": settings.service_fee
    }

@router.put("/settings")
def update_store_settings(data: StoreSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Strictly enforce that only Admins can change store settings
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update store settings.")
        
    settings = db.query(StoreSettings).first()
    if not settings:
        settings = StoreSettings()
        db.add(settings)
        
    settings.global_discount = data.global_discount
    settings.global_tax = data.global_tax
    settings.service_fee = data.service_fee
    
    db.commit()
    return {"message": "Settings updated successfully."}