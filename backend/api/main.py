from importlib import import_module

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import get_settings


settings = get_settings()

app = FastAPI(
	title=settings.app_name,
	version=settings.app_version,
	description="Your personal data, unified.",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.cors_origin_list,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


def include_router_if_available(module_path: str, prefix: str = "", tags: list[str] | None = None) -> None:
	module = import_module(module_path)
	router = getattr(module, "router", None)
	if router is not None:
		app.include_router(router, prefix=prefix, tags=tags)


@app.get("/health")
def health() -> dict[str, str]:
	return {"status": "ok"}


include_router_if_available("api.routers.auth")
include_router_if_available("api.routers.emails", prefix=settings.api_prefix)
include_router_if_available("api.routers.documents", prefix=settings.api_prefix)
include_router_if_available("api.routers.search", prefix=settings.api_prefix)
include_router_if_available("api.routers.connectors", prefix=settings.api_prefix)
include_router_if_available("api.routers.developer", prefix=settings.api_prefix)
include_router_if_available("api.routers.chat", prefix=settings.api_prefix)
include_router_if_available("api.routers.ws")

