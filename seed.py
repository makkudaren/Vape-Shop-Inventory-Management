import random
import time
from backend.database import SessionLocal, engine, Base
from backend.models import Product, DefectiveItem, User, AuditLog
from backend.utils.security import get_password_hash

def seed_database():
    print("\n==========================================")
    print("   KNE Vape Shop - Database Seeder")
    print("==========================================")
    
    choice = input("Press 1 for Actual Market Data, 2 for Random Sample Data, or 0 for Users Only (Empty Inventory): ").strip()
    
    if choice not in ["0", "1", "2"]:
        print("Invalid choice. Exiting seeder.")
        return

    # 1. Recreate the database tables
    print("\nCreating database tables...")
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
        
        # ====================================================
        # OPTION 0: USERS ONLY (EMPTY INVENTORY)
        # ====================================================
        if choice == "0":
            print("\n✅ SUCCESS! Seeded Admin and Staff users only. The inventory is completely empty!")
            return

        products_added = 0

        # ====================================================
        # OPTION 1: ACTUAL MARKET DATA
        # ====================================================
        if choice == "1":
            print("Generating ACTUAL market data...")
            
            # Actual Data References
            disposables = [
                ("Toha", 250.00), ("Chillax", 650.00), ("Flava", 450.00), 
                ("Geek Bar", 550.00), ("Grip Bar", 650.00)
            ]
            
            # (Brand, Battery Price, Pod Price)
            devices_and_pods = [
                ("Relx", 2000.00, 270.00), ("Xblack", 400.00, 550.00), 
                ("Amz", 400.00, 450.00), ("Xvape", 400.00, 450.00), 
                ("Black Elite", 300.00, 350.00), ("Flava Black Oxbar", 300.00, 350.00)
            ]
            
            # common_flavors = ["Mint Ice", "Watermelon Lush", "Strawberry Kiwi", "Mango Tango"]
            common_flavors = ["E-Juice"]
            
            def add_item(sku, title, brand, flavor, category, price):
                nonlocal products_added
                if not db.query(Product).filter(Product.sku == sku).first():
                    stock = random.randint(15, 60)
                    new_product = Product(
                        sku=sku, title=title, brand=brand, flavor=flavor,
                        category=category, price=price, stock=stock,
                        status="Low Stock" if stock <= 10 else "In Stock"
                    )
                    db.add(new_product)
                    products_added += 1

            # Build Disposables
            for brand, price in disposables:
                for idx, flavor in enumerate(common_flavors):
                    sku = f"DISP-{brand[:3].upper()}-10{idx}"
                    add_item(sku, f"{brand} Disposable", brand, flavor, "Disposables", price)

            # Build Hardware & Accessories
            for brand, bat_price, pod_price in devices_and_pods:
                sku_bat = f"HARD-{brand[:3].upper()}-BAT"
                add_item(sku_bat, f"{brand} Battery Device", brand, "N/A", "Battery", bat_price)
                
                for idx, flavor in enumerate(common_flavors):
                    sku_pod = f"ACC-{brand[:3].upper()}-P{idx}"
                    add_item(sku_pod, f"{brand} Pod Cartridge", brand, flavor, "Pod", pod_price)
            
            db.commit()

        # ====================================================
        # OPTION 2: RANDOM SAMPLE DATA
        # ====================================================
        elif choice == "2":
            print("Generating 75 random sample products...")
            categories = ["E-Liquid", "Disposables", "Hardware", "Accessories"]
            brands = ["GeekVape", "Voopoo", "Smok", "Relx", "ElfBar", "Vaporesso", "JuiceHead", "Naked100", "Oxva"]
            flavors = ["Watermelon Ice", "Strawberry Kiwi", "Mango", "Blue Razz", "Mint", "Classic Tobacco", "Grape", "Peach Ice", "N/A"]

            for i in range(1, 76):
                category = random.choice(categories)
                brand = random.choice(brands)
                
                if category in ["E-Liquid", "Disposables"]:
                    flavor = random.choice([f for f in flavors if f != "N/A"])
                else:
                    flavor = "N/A"

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

                prefix = category[:4].upper()
                sku = f"{prefix}-{random.randint(1000, 9999)}"

                stock = random.randint(0, 100)
                status = "Low Stock" if stock <= 10 else "In Stock"

                existing = db.query(Product).filter(Product.sku == sku).first()
                if not existing:
                    new_product = Product(
                        sku=sku, title=title, brand=brand, flavor=flavor,
                        category=category, price=price, stock=stock, status=status
                    )
                    db.add(new_product)
                    products_added += 1

            db.commit()

        # 4. Seed at least 5 Defective Items (For Options 1 & 2)
        print("Seeding Defective Items...")
        
        target_products = db.query(Product).filter(Product.stock > 10).limit(5).all()
        reasons = ["Leaking", "Auto-firing", "Dead Battery", "Burnt Taste"]
        
        defects_added = 0
        for product in target_products:
            defect = db.query(DefectiveItem).filter(DefectiveItem.product_id == product.id).first()
            if not defect:
                qty_lost = random.randint(1, 3)
                new_defect = DefectiveItem(
                    product_id=product.id,
                    quantity=qty_lost,
                    reason=random.choice(reasons),
                    note="Generated defect for testing.",
                    reported_by=admin_user.id
                )
                db.add(new_defect)
                product.stock -= qty_lost 
                defects_added += 1
                
        db.commit()

        print(f"\n✅ SUCCESS! Seeded Users, {products_added} Products, and {defects_added} Defects into the database!")

    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()