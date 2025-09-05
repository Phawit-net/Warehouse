from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import JWTManager
from argon2 import PasswordHasher

cors = CORS()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)
ph = PasswordHasher()  # สำหรับ hash/verify password