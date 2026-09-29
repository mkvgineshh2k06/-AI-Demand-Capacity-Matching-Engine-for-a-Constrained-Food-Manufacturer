import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Demand-Capacity Matching Engine API",
    description="Intelligence Backend for BioKraft Food Manufacturing Optimization",
    version="1.0.0"
)

# 1. Configured generic DEV CORS permitting local UI integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Flexible environment rule for hackathon cross-Origin access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# 2. Global Exception Handling (Securing stack traces natively out of JSON)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Schema validation failed on requested body inputs."}
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    # Log securely server side
    logger.error(f"Business Logic Error: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid business logic variables submitted."} # Do not expose stack traces!
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected Internal server crash: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal processing error occurred."}
    )
