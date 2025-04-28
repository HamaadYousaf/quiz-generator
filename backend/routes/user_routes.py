import datetime
from fastapi import APIRouter, Depends, HTTPException
import jwt
from pydantic import BaseModel
import bcrypt
from supabase import create_client
import os
from dotenv import load_dotenv
from services.auth import get_current_user

load_dotenv()

router = APIRouter()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"


class UserRegister(BaseModel):
    username: str
    email: str
    password: str


@router.post("/register")
async def register_user(user: UserRegister):
    # Check if user already exists
    existing_user = (
        supabase.table("users").select("*").eq("email", user.email).execute()
    )

    if existing_user.data:
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Hash the password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(user.password.encode("utf-8"), salt).decode("utf-8")

    # Insert new user
    data = {
        "username": user.username,
        "email": user.email,
        "password_hash": hashed_password,
    }

    response = supabase.table("users").insert(data).execute()

    return {"message": "User registered successfully."}


class UserLogin(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login_user(user: UserLogin):
    # Find user by email
    result = supabase.table("users").select("*").eq("email", user.email).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    db_user = result.data[0]

    stored_hash = db_user["password_hash"]

    # Verify password
    if not bcrypt.checkpw(user.password.encode("utf-8"), stored_hash.encode("utf-8")):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    # Generate JWT token
    token_payload = {
        "user_id": db_user["id"],
        "username": db_user["username"],
        "email": db_user["email"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
    }

    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {"access_token": token}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
    }
