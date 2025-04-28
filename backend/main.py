from fastapi import FastAPI
from routes import quiz_routes, user_routes

app = FastAPI()

app.include_router(quiz_routes.router)
app.include_router(user_routes.router)
