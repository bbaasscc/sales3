"""Sales Dashboard API - Main application entry point."""
from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

from database import db, client

# Routers
from routers.auth_routes import router as auth_router
from routers.admin import router as admin_router
from routers.pipeline import router as pipeline_router
from routers.email_ingest import router as email_ingest_router
from routers.leads import router as leads_router
from routers.dashboard import router as dashboard_router
from routers.tasks import router as tasks_router
from routers.notifications import router as notifications_router
from routers.commission import router as commission_router

# Services
from services.sync_service import seed_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()


# Health check (required by Kubernetes)
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Register routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(pipeline_router)
app.include_router(email_ingest_router)
app.include_router(leads_router)
app.include_router(dashboard_router)
app.include_router(tasks_router)
app.include_router(notifications_router)
app.include_router(commission_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed_database()


@app.on_event("shutdown")
async def shutdown():
    client.close()
