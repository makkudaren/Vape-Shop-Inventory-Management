from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from typing import Optional


from backend.database import get_db
from backend.models import Product, DefectiveItem, AuditLog, User
from backend.schemas import ProductCreate, ProductUpdate, DefectReport, BatchAddRequest
from backend.schemas import BatchAddRequest, BatchDefectRequest, DefectUpdate, DefectResolve
from backend.utils.security import get_current_user

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

def log_action(db: Session, user_id: int, action: str, target: str):
    log = AuditLog(user_id=user_id, action=action, target=target)
    db.add(log)
    db.commit()
    total_stock = sum([p.stock for p in db.query(Product).all()])
    total_defective = sum([d.quantity for d in db.query(DefectiveItem).all()])
    low_stock_count = db.query(Product).filter(Product.stock <= 10).count()
    return {"total_stock": total_stock, "total_defective": total_defective, "low_stock": low_stock_count}

@router.get("")
def get_inventory(
    search: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    flavor: Optional[str] = None,
    sort: str = "created_at",
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=2000),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    # 1. Search Bar 
    if search and search.strip():
        from sqlalchemy import or_ 
        clean_search = search.strip()
        query = query.filter(or_(
            Product.sku.ilike(f"%{clean_search}%"),
            Product.title.ilike(f"%{clean_search}%"),
            Product.flavor.ilike(f"%{clean_search}%")
        ))
        
    # 2. Dropdown Filters (Upgraded to ignore spaces and case-sensitivity!)
    if category and category.strip():
        query = query.filter(Product.category.ilike(category.strip()))
        
    if brand and brand.strip():
        query = query.filter(Product.brand.ilike(brand.strip()))
        
    if flavor and flavor.strip():
        query = query.filter(Product.flavor.ilike(flavor.strip()))
        
    # 3. Sorting
    if sort == "updated_at":
        query = query.order_by(desc(Product.updated_at))
    elif sort == "stock_low":
        query = query.order_by(Product.stock.asc())
    elif sort == "stock_high":
        query = query.order_by(Product.stock.desc())
    elif sort == "price_low":
        query = query.order_by(Product.price.asc())
    elif sort == "price_high":
        query = query.order_by(Product.price.desc())
    else:
        query = query.order_by(desc(Product.created_at))
    
    # 4. Pagination
    total = query.count()
    products = query.offset((page - 1) * limit).limit(limit).all()
    
    result_data = []
    for p in products:
        p.status = "Out of Stock" if p.stock == 0 else "Low Stock" if p.stock <= 10 else "In Stock"
        result_data.append({
            "id": p.id,
            "sku": p.sku,
            "title": p.title,
            "brand": p.brand,
            "flavor": p.flavor,
            "category": p.category,
            "price": p.price,
            "stock": p.stock,
            "status": p.status,
            "updated_at": p.updated_at or p.created_at
        })
    
    db.commit()
    return {"total": total, "page": page, "pages": (total + limit - 1) // limit, "data": result_data}



@router.post("")
def create_product(data: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Block negative numbers for price and stock
    if data.price < 0 or data.stock < 0:
        raise HTTPException(status_code=400, detail="Price and Stock cannot be negative.")

    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    try:
        product_data = data.model_dump()
    except AttributeError:
        product_data = data.dict()
        
    new_product = Product(**product_data)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    log_action(db, current_user.id, "Created Product", data.sku)
    return {"message": "Product created successfully", "id": new_product.id}

@router.put("/{product_id}")
def update_product(product_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Compare old values to new values and build the change log
    changes = []
    
    def check_change(field_name, old_val, new_val):
        if str(old_val) != str(new_val):  
            changes.append(f"• {field_name}: {old_val} ➔ {new_val}")

    check_change("SKU", product.sku, payload.get("sku", product.sku))
    check_change("Title", product.title, payload.get("title", product.title))
    check_change("Brand", product.brand, payload.get("brand", product.brand))
    check_change("Flavor", product.flavor, payload.get("flavor", product.flavor))
    check_change("Category", product.category, payload.get("category", product.category))
    check_change("Price", product.price, payload.get("price", product.price))
    check_change("Stock", product.stock, payload.get("stock", product.stock))

    # Apply the updates to the database model
    product.sku = payload.get("sku", product.sku)
    product.title = payload.get("title", product.title)
    product.brand = payload.get("brand", product.brand)
    product.flavor = payload.get("flavor", product.flavor)
    product.category = payload.get("category", product.category)
    product.price = payload.get("price", product.price)
    product.stock = payload.get("stock", product.stock)
    
    # Update status based on new stock
    product.status = "Out of Stock" if product.stock == 0 else "Low Stock" if product.stock <= 10 else "In Stock"

    if changes:
        action_text = "Updated Product Details:\n" + "\n".join(changes)
    else:
        action_text = "Saved Product (No fields were changed)"

    audit = AuditLog(
        product_id=product.id,
        target=product.sku,
        user_id=current_user.id, 
        action=action_text
    )
    
    db.add(audit)
    db.commit()

    return {"message": "Product updated successfully"}

@router.post("/{product_id}/defect")
def report_defect(product_id: int, data: DefectReport, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if product.stock < data.quantity:
        raise HTTPException(status_code=400, detail=f"Cannot deduct {data.quantity}. You only have {product.stock} in stock.")
    
    # Subtract from inventory
    product.stock -= data.quantity
    
    # Add to defective
    defect = DefectiveItem(
        product_id=product.id, quantity=data.quantity, 
        reason=data.reason, note=data.note, reported_by=current_user.id
    )
    db.add(defect)
    db.commit()
    
    log_action(db, current_user.id, f"Reported {data.quantity} Defective", product.sku)
    return {"message": "Defect reported and stock updated"}

@router.get("/defective")
def get_defective_items(
    search: Optional[str] = None,
    sort: str = "created_at",
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=100),
    db: Session = Depends(get_db)
):
    # Join with Product and User tables to search by SKU/Title and get names
    query = db.query(DefectiveItem, Product, User).join(
        Product, DefectiveItem.product_id == Product.id
    ).outerjoin(
        User, DefectiveItem.reported_by == User.id
    )

    if search:
        query = query.filter(or_(
            Product.sku.ilike(f"%{search}%"),
            Product.title.ilike(f"%{search}%"),
            DefectiveItem.reason.ilike(f"%{search}%")
        ))
    if sort == "updated_at":
        query = query.order_by(desc(DefectiveItem.updated_at))
    elif sort == "qty_high":
        query = query.order_by(desc(DefectiveItem.quantity))
    elif sort == "qty_low":
        query = query.order_by(DefectiveItem.quantity.asc())
    else:
        query = query.order_by(desc(DefectiveItem.created_at))

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    res = []
    for defect, product, user in items:
        res.append({
            "id": defect.id,
            "sku": product.sku,
            "title": product.title,
            "brand": product.brand,
            "quantity": defect.quantity,
            "reason": defect.reason,
            "reporter": user.name if user else "Unknown",
            "date": defect.created_at,
            "updated_at": defect.updated_at or defect.created_at
        })

    return {"total": total, "page": page, "pages": (total + limit - 1) // limit, "data": res}

@router.get("/{product_id}/history")
def get_product_history(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    logs = db.query(AuditLog).filter(
        or_(
            AuditLog.product_id == product.id, 
            AuditLog.target == product.sku
        )
    ).order_by(desc(AuditLog.timestamp)).all()
    
    res = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        res.append({
            "action": log.action,
            "user": user.name if user else "System",
            "date": log.timestamp
        })
    return res


@router.post("/batch-add")
def batch_add_products(data: BatchAddRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    added_count = 0
    updated_count = 0

    # Pre-validate all items before saving anything
    for item in data.items:
        if item.price < 0 or item.stock < 0:
            raise HTTPException(status_code=400, detail=f"Price and Stock cannot be negative for SKU: {item.sku}")
    
    for item in data.items:
        product = db.query(Product).filter(Product.sku == item.sku).first()
        if product:
            # Update existing product stock and details
            product.stock += item.stock
            product.title = item.title
            product.brand = item.brand
            product.flavor = item.flavor
            product.category = item.category
            product.price = item.price
            product.status = "Low Stock" if product.stock <= 10 else "In Stock"
            updated_count += 1
            log_action(db, current_user.id, f"Batch Restocked (+{item.stock})", product.sku)
        else:
            # Create new product
            try:
                p_data = item.model_dump()
            except AttributeError:
                p_data = item.dict()
                
            new_product = Product(**p_data)
            new_product.status = "Low Stock" if new_product.stock <= 10 else "In Stock"
            db.add(new_product)
            db.commit() # Commit here to generate ID for logging
            log_action(db, current_user.id, "Batch Created Product", item.sku)
            added_count += 1
            
    db.commit()
    return {"message": f"Batch complete: {added_count} created, {updated_count} updated."}


@router.post("/batch-defect")
def batch_report_defects(data: BatchDefectRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. PRE-VALIDATE: Check all items BEFORE saving anything to the database
    for item in data.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
            
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="One or more products were not found.")
            
        if product.stock < item.quantity:
            # Send back the exact SKU so the user knows which row failed!
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.sku}. (Available: {product.stock}, Tried: {item.quantity})")

    # 2. If everything is valid, process the entire batch
    reported_count = 0
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        
        # Deduct stock and add defect
        product.stock -= item.quantity
        product.status = "Low Stock" if product.stock <= 10 else "In Stock"
        
        defect = DefectiveItem(
            product_id=product.id, quantity=item.quantity, 
            reason=item.reason, note=item.note, reported_by=current_user.id
        )
        db.add(defect)
        log_action(db, current_user.id, f"Batch Defect Report (-{item.quantity})", product.sku)
        reported_count += 1
        
    db.commit()
    return {"message": f"Successfully reported {reported_count} defective item records."}

@router.put("/defective/{defect_id}")
def update_defect(defect_id: int, data: DefectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    defect = db.query(DefectiveItem).filter(DefectiveItem.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect record not found")
        
    product = db.query(Product).filter(Product.id == defect.product_id).first()
    
    # Calculate difference to adjust inventory stock accordingly
    diff = data.quantity - defect.quantity
    
    if diff > 0: # Adding more to the defect pile
        if product.stock < diff:
            raise HTTPException(status_code=400, detail="Not enough active stock to increase defect quantity.")
        product.stock -= diff
    elif diff < 0: # Returning the difference to the shelf
        product.stock += abs(diff)
        
    defect.quantity = data.quantity
    
    # Auto-clean if they edit it down to 0
    if defect.quantity <= 0:
        db.delete(defect)
        
    db.commit()
    log_action(db, current_user.id, f"Adjusted Defect Qty to {data.quantity}", product.sku)
    return {"message": "Defect quantity updated and stock adjusted."}


@router.post("/defective/{defect_id}/resolve")
def resolve_defect(defect_id: int, data: DefectResolve, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    defect = db.query(DefectiveItem).filter(DefectiveItem.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect record not found")
        
    product = db.query(Product).filter(Product.id == defect.product_id).first()
    
    # 1. Validate the quantity
    if data.quantity <= 0 or data.quantity > defect.quantity:
        raise HTTPException(status_code=400, detail=f"Invalid quantity. Must be between 1 and {defect.quantity}.")
    
    # 2. Process the action
    if data.action == "return":
        product.stock += data.quantity
        msg = f"Resolved: {data.quantity} units returned to active stock."
        log_action(db, current_user.id, f"Defect False Alarm (+{data.quantity} restored)", product.sku)
    elif data.action == "dispose":
        # Stock was already deducted, just recording the official loss
        msg = f"Resolved: {data.quantity} units permanently written off."
        log_action(db, current_user.id, f"Defect Disposed/Trashed ({data.quantity} units)", product.sku)
    else:
        raise HTTPException(status_code=400, detail="Invalid resolution action")
    
    # 3. Partially deduct from the defect record
    defect.quantity -= data.quantity
    
    # 4. Clean up the record if all defects have been processed
    if defect.quantity <= 0:
        db.delete(defect)
        
    db.commit()
    return {"message": msg}

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    # Query the database for all unique/distinct category strings
    categories = db.query(Product.category).distinct().all()
    
    # SQLAlchemy returns a list of tuples like [('E-Liquid',), ('Hardware',)]
    return [cat[0] for cat in categories if cat[0]]

@router.get("/brands")
def get_brands(db: Session = Depends(get_db)):
    brands = db.query(Product.brand).distinct().all()
    return [b[0] for b in brands if b[0]]

@router.get("/flavors")
def get_flavors(db: Session = Depends(get_db)):
    flavors = db.query(Product.flavor).distinct().all()
    return [f[0] for f in flavors if f[0]]

@router.get("/autocomplete")
def autocomplete_products(q: str = Query(""), db: Session = Depends(get_db)):
        
    # Search by SKU or Title, limit to 15 to keep the network payload tiny
    products = db.query(Product).filter(
        or_(
            Product.sku.ilike(f"%{q}%"), 
            Product.title.ilike(f"%{q}%")
        )
    ).limit(15).all()
    
    return [{
        "id": p.id, 
        "sku": p.sku, 
        "title": p.title, 
        "brand": p.brand,
        "flavor": p.flavor,
        "category": p.category,
        "price": p.price
    } for p in products]

@router.get("/summary")
def get_inventory_summary(db: Session = Depends(get_db)):
    total_stock = db.query(func.sum(Product.stock)).scalar() or 0
    low_stock = db.query(Product).filter(Product.stock <= 10).count()
    total_defective = db.query(func.sum(DefectiveItem.quantity)).scalar() or 0
    total_value = db.query(func.sum(Product.stock * Product.price)).scalar() or 0.0
    total_loss = db.query(func.sum(DefectiveItem.quantity * Product.price))\
                   .join(Product, DefectiveItem.product_id == Product.id).scalar() or 0.0
                   
    return {
        "total_stock": total_stock,
        "low_stock": low_stock,
        "total_defective": total_defective,
        "total_value": float(total_value),
        "total_loss": float(total_loss)
    }

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # 1. First, delete any attached defects to prevent database crashes
    db.query(DefectiveItem).filter(DefectiveItem.product_id == product.id).delete()
    
    # 2. Delete the specific product history logs
    db.query(AuditLog).filter(AuditLog.product_id == product.id).delete()

    # 3. Now it is safe to delete the product itself
    db.delete(product)
    
    # 4. Log the deletion in the general system logs
    log_action(db, current_user.id, f"Deleted Product: {product.sku}", "SYSTEM")
    
    db.commit()
    return {"message": "Product permanently deleted."}