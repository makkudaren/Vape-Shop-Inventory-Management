import random
from backend.database import SessionLocal, engine, Base
from backend.models import Product, DefectiveItem, User, AuditLog
from backend.utils.security import get_password_hash

def seed_database():
    # 1. Recreate the database tables (this ensures updated_at columns exist!)
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 2. Seed Admin & Staff Accounts
        print("Seeding Users...")
        
        # Admin Account
        admin_email = "admin@example.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                name="Admin User",
                email=admin_email,
                hashed_password=get_password_hash("password"),
                role="admin",
                is_verified=True
            )
            db.add(admin_user)

        # Staff Account
        staff_email = "staff@example.com"
        staff_user = db.query(User).filter(User.email == staff_email).first()
        if not staff_user:
            staff_user = User(
                name="Staff User",
                email=staff_email,
                hashed_password=get_password_hash("password"),
                role="staff",
                is_verified=True
            )
            db.add(staff_user)

        db.commit()
        db.refresh(admin_user)

        # 3. Random Product Generator (Your exact logic!)
        print("Generating 75 sample products...")
        categories = ["E-Liquid", "Disposables", "Hardware", "Accessories"]
        brands = ["GeekVape", "Voopoo", "Smok", "Relx", "ElfBar", "Vaporesso", "JuiceHead", "Naked100", "Oxva"]
        flavors = ["Watermelon Ice", "Strawberry Kiwi", "Mango", "Blue Razz", "Mint", "Classic Tobacco", "Grape", "Peach Ice", "N/A"]

        products_added = 0

        for i in range(1, 76):
            category = random.choice(categories)
            brand = random.choice(brands)
            
            # Hardware and Accessories usually don't have flavors
            if category in ["E-Liquid", "Disposables"]:
                flavor = random.choice([f for f in flavors if f != "N/A"])
            else:
                flavor = "N/A"

            # Generate a realistic Title based on the category
            if category == "E-Liquid":
                title = f"{brand} Freebase 60ml"
                price = round(random.uniform(250.0, 600.0), 2)
            elif category == "Disposables":
                title = f"{brand} 5000 Puffs Disposable"
                price = round(random.uniform(300.0, 900.0), 2)
            elif category == "Hardware":
                title = f"{brand} Pod System Kit"
                price = round(random.uniform(800.0, 2500.0), 2)
            else:
                title = f"{brand} Replacement Coils (5-Pack)"
                price = round(random.uniform(150.0, 450.0), 2)

            # Generate a unique SKU (e.g., ELIQ-4921)
            prefix = category[:4].upper()
            sku = f"{prefix}-{random.randint(1000, 9999)}"

            # Generate random stock and determine status
            stock = random.randint(0, 100)
            status = "Low Stock" if stock <= 10 else "In Stock"

            # Check if SKU accidentally generated a duplicate
            existing = db.query(Product).filter(Product.sku == sku).first()
            if not existing:
                new_product = Product(
                    sku=sku,
                    title=title,
                    brand=brand,
                    flavor=flavor,
                    category=category,
                    price=price,
                    stock=stock,
                    status=status
                )
                db.add(new_product)
                products_added += 1

        db.commit()

        # 4. Seed a Defective Item to test the loss calculations on the dashboard
        print("Seeding a test Defective Item...")
        target_product = db.query(Product).filter(Product.stock > 5).first()
        if target_product:
            defect = db.query(DefectiveItem).filter(DefectiveItem.product_id == target_product.id).first()
            if not defect:
                new_defect = DefectiveItem(
                    product_id=target_product.id,
                    quantity=2,
                    reason="Leaking",
                    note="Random generated defect for testing",
                    reported_by=admin_user.id
                )
                db.add(new_defect)
                target_product.stock -= 2 # Deduct from active stock so math is accurate
                db.commit()

        print(f"✅ Successfully seeded Users, {products_added} Products, and 1 Defect into the database!")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()