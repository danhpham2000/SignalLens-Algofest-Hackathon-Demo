from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from db.postgres import postgres_repository
from routers import health, upload, demo, results, graph

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="SignalLens backend for upload, extraction, anomaly scoring, explanation, and graph sync.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(upload.router)
app.include_router(demo.router)
app.include_router(results.router)
app.include_router(graph.router)


@app.on_event("startup")
async def startup_event():
    postgres_repository.initialize()

@app.get("/")
async def root():
    return {
        "message": "SignalLens API is running",
        "pipeline": ["upload", "extract", "analyze", "explain", "result"],
        "integrations": {
            "postgres": postgres_repository.status(),
        },
    }
