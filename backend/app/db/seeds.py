"""
Script de seeds para poblar datos iniciales del sistema.
Ejecutar después de aplicar las migraciones.
"""
from sqlalchemy.orm import Session
from app.models.auth import User, UserRole, UserRoleAssignment
from app.models.org import OwnerGroup, Facility, FacilityUserAccess
from app.models.finance import FinanceCategory
from app.core.security import get_password_hash
from app.core.config import settings
import uuid
import os


def seed_database(db: Session):
    """Poblar la base de datos con datos iniciales"""
    
    # 1. Crear OwnerGroup
    owner_group = db.query(OwnerGroup).filter(OwnerGroup.name == "Grupo Geriátricos").first()
    if not owner_group:
        owner_group = OwnerGroup(
            id=uuid.uuid4(),
            name="Grupo Geriátricos"
        )
        db.add(owner_group)
        db.flush()
        print("✓ OwnerGroup creado: Grupo Geriátricos")
    else:
        print("→ OwnerGroup ya existe: Grupo Geriátricos")
    
    # 2. Crear Facilities (3 geriátricos con slugs)
    facilities_data = [
        {
            "code": "NSL",
            "name": "Nuestra Señora de Luján",
            "slug": "nuestra-senora-de-lujan"
        },
        {
            "code": "ET",
            "name": "El Trébol",
            "slug": "el-trebol"
        },
        {
            "code": "EA",
            "name": "El Amanecer",
            "slug": "el-amanecer"
        },
    ]
    
    facilities = {}
    for fac_data in facilities_data:
        facility = db.query(Facility).filter(
            Facility.owner_group_id == owner_group.id,
            Facility.code == fac_data["code"]
        ).first()
        
        if not facility:
            facility = Facility(
                id=uuid.uuid4(),
                owner_group_id=owner_group.id,
                name=fac_data["name"],
                code=fac_data["code"],
                slug=fac_data["slug"]
            )
            db.add(facility)
            db.flush()
            print(f"✓ Facility creado: {fac_data['code']} - {fac_data['name']} (slug: {fac_data['slug']})")
        else:
            # Actualizar slug si no existe
            if not facility.slug:
                facility.slug = fac_data["slug"]
                db.flush()
                print(f"→ Facility actualizado con slug: {fac_data['code']} - {fac_data['slug']}")
            else:
                print(f"→ Facility ya existe: {fac_data['code']} - {fac_data['name']}")
        
        facilities[fac_data["code"]] = facility
    
    # 3. Crear Roles
    roles_data = [
        {"code": "OWNER", "name": "Propietario"},
        {"code": "DOCTOR", "name": "Médico"},
    ]
    
    roles = {}
    for role_data in roles_data:
        role = db.query(UserRole).filter(UserRole.code == role_data["code"]).first()
        if not role:
            role = UserRole(
                id=uuid.uuid4(),
                code=role_data["code"],
                name=role_data["name"]
            )
            db.add(role)
            db.flush()
            print(f"✓ Role creado: {role_data['code']}")
        else:
            print(f"→ Role ya existe: {role_data['code']}")
        
        roles[role_data["code"]] = role
    
    # 4. Crear Usuarios (platform_admin, 2 owners, 1 medico, 1 staff)
    # Password desde env DEV_SEED_PASSWORD (fallback 'Admin123!')
    seed_password = os.getenv("DEV_SEED_PASSWORD", "Admin123!")
    
    users_data = [
        {
            "dni": "90000000",
            "email": None,
            "full_name": "Platform Admin",
            "is_platform_admin": True,
            "memberships": []  # Platform admin no necesita membresías
        },
        {
            "dni": "20000001",
            "email": "owner1@geriatricos.com",
            "full_name": "Propietario 1",
            "is_platform_admin": False,
            "memberships": [
                {"facility_code": "NSL", "role": "ADMIN"},
                {"facility_code": "ET", "role": "ADMIN"},
                {"facility_code": "EA", "role": "ADMIN"},
            ]
        },
        {
            "dni": "20000002",
            "email": "owner2@geriatricos.com",
            "full_name": "Propietario 2",
            "is_platform_admin": False,
            "memberships": [
                {"facility_code": "NSL", "role": "ADMIN"},
                {"facility_code": "ET", "role": "ADMIN"},
                {"facility_code": "EA", "role": "ADMIN"},
            ]
        },
        {
            "dni": "30000000",
            "email": "medico@geriatricos.com",
            "full_name": "Dr. Médico",
            "is_platform_admin": False,
            "memberships": [
                {"facility_code": "NSL", "role": "MEDICO"},
                {"facility_code": "ET", "role": "MEDICO"},
                {"facility_code": "EA", "role": "MEDICO"},
            ]
        },
        {
            "dni": "40000001",
            "email": "staff1@geriatricos.com",
            "full_name": "Staff G1",
            "is_platform_admin": False,
            "memberships": [
                {"facility_code": "NSL", "role": "STAFF"},
            ]
        },
    ]
    
    users = {}
    for user_data in users_data:
        # Buscar por DNI (prioritario) o email
        user = None
        if user_data["dni"]:
            user = db.query(User).filter(User.dni == user_data["dni"]).first()
        if not user and user_data["email"]:
            user = db.query(User).filter(User.email == user_data["email"]).first()
        
        if not user:
            user = User(
                id=uuid.uuid4(),
                dni=user_data["dni"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                password_hash=get_password_hash(seed_password),
                is_active=True,
                is_verified=True,
                is_platform_admin=user_data["is_platform_admin"]
            )
            db.add(user)
            db.flush()
            print(f"✓ Usuario creado: {user_data['dni']} - {user_data['full_name']}")
        else:
            # Actualizar campos si es necesario
            if user.is_platform_admin != user_data["is_platform_admin"]:
                user.is_platform_admin = user_data["is_platform_admin"]
                db.flush()
            print(f"→ Usuario ya existe: {user_data['dni']} - {user_data['full_name']}")
        
        users[user_data["dni"]] = user
    
    # 5. Crear FacilityUserAccess (membresías con role)
    for user_data in users_data:
        user_obj = users[user_data["dni"]]
        
        for membership_data in user_data["memberships"]:
            facility_obj = facilities[membership_data["facility_code"]]
            
            access = db.query(FacilityUserAccess).filter(
                FacilityUserAccess.facility_id == facility_obj.id,
                FacilityUserAccess.user_id == user_obj.id
            ).first()
            
            if not access:
                access = FacilityUserAccess(
                    id=uuid.uuid4(),
                    facility_id=facility_obj.id,
                    user_id=user_obj.id,
                    role=membership_data["role"],
                    is_active=True
                )
                db.add(access)
                db.flush()
                print(f"  ✓ Membresía creada: {user_data['dni']} → {membership_data['facility_code']} ({membership_data['role']})")
            else:
                # Actualizar role e is_active si es necesario
                if access.role != membership_data["role"]:
                    access.role = membership_data["role"]
                if not access.is_active:
                    access.is_active = True
                db.flush()
                print(f"  → Membresía actualizada: {user_data['dni']} → {membership_data['facility_code']} ({membership_data['role']})")
    
    # 6. Crear Categorías de Finanzas
    expense_categories = [
        "Sueldos",
        "Farmacia",
        "Insumos",
        "Servicios",
        "Mantenimiento",
        "Honorarios",
        "Otros"
    ]
    
    income_categories = [
        "Mensualidades",
        "Servicios adicionales",
        "Otros"
    ]
    
    for cat_name in expense_categories:
        category = db.query(FinanceCategory).filter(
            FinanceCategory.owner_group_id == owner_group.id,
            FinanceCategory.name == cat_name,
            FinanceCategory.type == "EXPENSE"
        ).first()
        
        if not category:
            category = FinanceCategory(
                id=uuid.uuid4(),
                owner_group_id=owner_group.id,
                name=cat_name,
                type="EXPENSE",
                is_active=True
            )
            db.add(category)
            db.flush()
            print(f"✓ Categoría creada: {cat_name} (EXPENSE)")
    
    for cat_name in income_categories:
        category = db.query(FinanceCategory).filter(
            FinanceCategory.owner_group_id == owner_group.id,
            FinanceCategory.name == cat_name,
            FinanceCategory.type == "INCOME"
        ).first()
        
        if not category:
            category = FinanceCategory(
                id=uuid.uuid4(),
                owner_group_id=owner_group.id,
                name=cat_name,
                type="INCOME",
                is_active=True
            )
            db.add(category)
            db.flush()
            print(f"✓ Categoría creada: {cat_name} (INCOME)")
    
    db.commit()
    print("\n✅ Seeds completados exitosamente!")


if __name__ == "__main__":
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        db.rollback()
        print(f"\nError en seeds: {e}")  # Removido emoji para evitar problemas de encoding
        raise
    finally:
        db.close()
