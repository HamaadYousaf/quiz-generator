from fastapi import FastAPI
from routes import quiz_routes, user_routes
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # or ["*"] for development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(quiz_routes.router)
app.include_router(user_routes.router)
