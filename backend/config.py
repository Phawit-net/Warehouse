import os
from datetime import timedelta

class Config:
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev_only_change_me")

    # เราใช้ access ผ่าน header + refresh ผ่าน cookie
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("ACCESS_EXPIRES_MIN", 20)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("REFRESH_EXPIRES_DAYS", 14)))

    # ป้องกัน CSRF สำหรับกรณีใช้ JWT ใน cookie (refresh/logout)
    JWT_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_CSRF_PROTECT = True  # จะให้ FE ส่ง X-CSRF-TOKEN มาเวลาเรียก refresh/logout


    # CORS
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")