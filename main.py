from fastapi import FastAPI
from routes import quiz_routes

app = FastAPI()

app.include_router(quiz_routes.router)
