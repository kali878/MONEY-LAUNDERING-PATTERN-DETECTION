from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Neo4jConfig:
    uri: str
    user: str
    password: str
    database: str


@dataclass(frozen=True)
class AppConfig:
    frontend_url: str
    neo4j: Neo4jConfig

    @staticmethod
    def from_env() -> "AppConfig":
        frontend_url = os.getenv("FRONTEND_URL", "https://anup-security-portal-ai.vercel.app/").strip()
        neo4j = Neo4jConfig(
            uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
            user=os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j")),
            password=os.getenv("NEO4J_PASSWORD", "password"),
            database=os.getenv("NEO4J_DB", "neo4j"),
        )
        return AppConfig(frontend_url=frontend_url, neo4j=neo4j)


# Singleton-like config for direct importing
CONFIG = AppConfig.from_env()
