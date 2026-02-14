from fastapi import APIRouter, HTTPException, Depends
from auth import pwd_context, create_token, get_current_user
from database import db
from models import UserRegister, UserLogin
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register_user(data: UserRegister):
    email = data.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "admin" if email.endswith("@gmail.com") else "salesperson"
    user = {
        "user_id": str(uuid.uuid4()),
        "email": email,
        "name": data.name.strip(),
        "sales_number": data.sales_number.strip(),
        "role": role,
        "password_hash": pwd_context.hash(data.password),
    }
    await db.users.insert_one(user)
    token = create_token(user["user_id"], user["role"])
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "sales_number": user["sales_number"], "role": user["role"]}}


@router.post("/login")
async def login_user(data: UserLogin):
    import logging
    logger = logging.getLogger(__name__)
    email = data.email.strip().lower()
    logger.info(f"Login attempt for: {email}")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        logger.warning(f"Login failed: user not found for {email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not pwd_context.verify(data.password, user["password_hash"]):
        logger.warning(f"Login failed: wrong password for {email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["user_id"], user["role"])
    logger.info(f"Login success: {email} ({user['role']})")
    return {"token": token, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "sales_number": user.get("sales_number", ""), "role": user["role"]}}


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "sales_number": user.get("sales_number", ""), "role": user["role"]}


@router.put("/user/{user_id}/role")
async def update_user_role(user_id: str, body: dict, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    new_role = body.get("role")
    if new_role not in ["admin", "salesperson"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role}})
    return {"message": f"Role updated to {new_role}"}
