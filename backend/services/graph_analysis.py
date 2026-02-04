import logging
from typing import Dict, List, Any
from neo4j import GraphDatabase
from utils.config import CONFIG


class GraphAnalyzer:
    """Query transaction networks from Neo4j with safe fallbacks."""

    def __init__(self):
        self._logger = logging.getLogger(__name__)
        uri = CONFIG.neo4j.uri
        user = CONFIG.neo4j.user
        password = CONFIG.neo4j.password
        try:
            self._driver = GraphDatabase.driver(uri, auth=(user, password))
            self._driver.verify_connectivity()
            self._logger.info("GraphAnalyzer connected to Neo4j")
        except Exception as e:
            self._logger.warning(f"Could not connect to Neo4j. Falling back to CSV synth. Details: {e}")
            self._driver = None

    def close(self):
        if self._driver is not None:
            self._driver.close()

    def get_transaction_network(self, entity_id: str, limit: int = 100) -> Dict[str, List[Dict[str, Any]]]:  # Increased limit for more data
        if self._driver is None:
            return {"nodes": [], "edges": []}
        with self._driver.session(database=CONFIG.neo4j.database) as session:
            query = """
            MATCH (entity)
            WHERE entity.person_id = $entity_id OR entity.cin = $entity_id
            MATCH (entity)-[:OWNS_ACCOUNT]->(account)
            MATCH (account)-[tx:TRANSACTION]-(peer_account)
            MATCH (peer_entity)-[:OWNS_ACCOUNT]->(peer_account)
            WHERE id(entity) <> id(peer_entity)
            RETURN
                coalesce(entity.person_id, entity.cin) AS sourceId,
                coalesce(entity.full_name, entity.company_name) AS sourceName,
                labels(entity)[0] AS sourceType,
                
                coalesce(peer_entity.person_id, peer_entity.cin) AS targetId,
                coalesce(peer_entity.full_name, peer_entity.company_name) AS targetName,
                labels(peer_entity)[0] AS targetType,
                
                tx.amount_inr AS amount,
                // --- THIS IS THE FIX: Explicitly return directionality ---
                startNode(tx) = account AS isOutgoing
            ORDER BY tx.timestamp DESC
            LIMIT $limit
            """
            results = session.run(query, entity_id=entity_id, limit=limit)
            
            nodes = {}
            edges = []
            
            for record in results:
                source_id = record["sourceId"]
                if source_id not in nodes:
                    nodes[source_id] = {
                        "id": source_id, "label": record["sourceName"], 
                        "type": record["sourceType"], "isCenter": True
                    }
                
                target_id = record["targetId"]
                if target_id not in nodes:
                    nodes[target_id] = {
                        "id": target_id, "label": record["targetName"], 
                        "type": record["targetType"], "isCenter": False
                    }
                
                is_outgoing = record["isOutgoing"]
                
                edges.append({
                    "source": source_id, # Always from the center for this model
                    "target": target_id,
                    "label": f"₹{int(record['amount']):,}",
                    "isOutgoing": is_outgoing # Add the direction flag
                })
            
            return {"nodes": list(nodes.values()), "edges": edges}
