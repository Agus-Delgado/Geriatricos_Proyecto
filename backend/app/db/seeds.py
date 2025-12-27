"""
Script de seeds para poblar datos iniciales del sistema.
Ejecutar después de aplicar las migraciones.
"""
from sqlalchemy.orm import Session
from app.models.auth import User, UserRole, UserRoleAssignment
from app.models.org import OwnerGroup, Facility, FacilityUserAccess
from app.models.finance import FinanceCategory
from app.core.security import get_password_hash
import uuid


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
    
    # 2. Crear Facilities (3 sedes)
    facilities_data = [
        {"code": "G1", "name": "Hogar 1"},
        {"code": "G2", "name": "Hogar 2"},
        {"code": "G3", "name": "Hogar 3"},
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
                code=fac_data["code"]
            )
            db.add(facility)
            db.flush()
            print(f"✓ Facility creado: {fac_data['code']} - {fac_data['name']}")
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
    
    # 4. Crear Usuarios (2 owners + 1 doctor)
    users_data = [
        {
            "email": "owner1@geriatricos.com",
            "full_name": "Propietario 1",
            "role_code": "OWNER",
            "password": "owner123"  # TEMPORAL - cambiar en producción
        },
        {
            "email": "owner2@geriatricos.com",
            "full_name": "Propietario 2",
            "role_code": "OWNER",
            "password": "owner123"  # TEMPORAL
        },
        {
            "email": "doctor@geriatricos.com",
            "full_name": "Dr. Médico",
            "role_code": "DOCTOR",
            "password": "doctor123"  # TEMPORAL
        },
    ]
    
    users = {}
    for user_data in users_data:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if not user:
            user = User(
                id=uuid.uuid4(),
                email=user_data["email"],
                full_name=user_data["full_name"],
                password_hash=get_password_hash(user_data["password"]),
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.flush()
            print(f"✓ Usuario creado: {user_data['email']}")
        else:
            print(f"→ Usuario ya existe: {user_data['email']}")
        
        # Asignar rol
        assignment = db.query(UserRoleAssignment).filter(
            UserRoleAssignment.user_id == user.id,
            UserRoleAssignment.role_id == roles[user_data["role_code"]].id
        ).first()
        
        if not assignment:
            assignment = UserRoleAssignment(
                id=uuid.uuid4(),
                user_id=user.id,
                role_id=roles[user_data["role_code"]].id
            )
            db.add(assignment)
            db.flush()
            print(f"  ✓ Rol asignado: {user_data['role_code']}")
        
        users[user_data["email"]] = user
    
    # 5. Crear FacilityUserAccess (3 usuarios × 3 sedes = 9 registros)
    for user_email, user_obj in users.items():
        for fac_code, facility_obj in facilities.items():
            access = db.query(FacilityUserAccess).filter(
                FacilityUserAccess.facility_id == facility_obj.id,
                FacilityUserAccess.user_id == user_obj.id
            ).first()
            
            if not access:
                access = FacilityUserAccess(
                    id=uuid.uuid4(),
                    facility_id=facility_obj.id,
                    user_id=user_obj.id,
                    access_level="CLINICAL"
                )
                db.add(access)
                db.flush()
                print(f"  ✓ Acceso creado: {user_email} → {fac_code}")
    
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
