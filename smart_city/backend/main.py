from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes import compiler_routes, automata_routes, ai_routes, data_routes, ws_routes

load_dotenv()

app = FastAPI(title="Smart City Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compiler_routes.router, prefix="/api")
app.include_router(automata_routes.router, prefix="/api/automata")
app.include_router(ai_routes.router, prefix="/api/ai")
app.include_router(data_routes.router, prefix="/api/data")
app.include_router(ws_routes.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Neo-Sousse 2030 Backend API"}

@app.get("/test")
def test():
    print("TEST ROUTE CALLED")
    return {"ok": True}