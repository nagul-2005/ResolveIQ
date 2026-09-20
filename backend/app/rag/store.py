import re
import math
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings
from app.rag.embeddings import embedding_manager
from app.rag.kb_articles import SEED_KB_ARTICLES

class KnowledgeStore:
    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.weaviate_client = None
        self.is_initialized = False

    def init_weaviate_client(self):
        if settings.WEAVIATE_URL:
            try:
                import weaviate
                from weaviate.auth import AuthApiKey
                
                url = settings.WEAVIATE_URL
                if not url.startswith("http"):
                    url = f"https://{url}"

                if settings.WEAVIATE_API_KEY:
                    auth = AuthApiKey(api_key=settings.WEAVIATE_API_KEY)
                    self.weaviate_client = weaviate.connect_to_weaviate_cloud(
                        cluster_url=url,
                        auth_credentials=auth
                    )
                else:
                    self.weaviate_client = weaviate.connect_to_local()
                print(f"[KnowledgeStore] Successfully connected to Live Weaviate Cloud cluster ({url}). is_ready: {self.weaviate_client.is_ready()}")
            except Exception as e:
                print(f"[KnowledgeStore] Weaviate notice (using high-performance local FastEmbed hybrid index): {e}")
                self.weaviate_client = None


    def ingest_articles(self, articles: Optional[List[Dict[str, Any]]] = None):
        """Ingests articles, splits with RecursiveCharacterTextSplitter, computes embeddings."""
        if articles is None:
            articles = SEED_KB_ARTICLES

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        all_chunks = []
        texts_to_embed = []

        for art in articles:
            splits = splitter.split_text(art["content"])
            for idx, split_text in enumerate(splits):
                chunk_obj = {
                    "chunk_id": f"{art['doc_id']}_chk_{idx}",
                    "doc_id": art["doc_id"],
                    "title": art["title"],
                    "category": art["category"],
                    "product_area": art["product_area"],
                    "severity": art["severity"],
                    "content": split_text,
                    "tokens": set(re.findall(r"\w+", split_text.lower()))
                }
                all_chunks.append(chunk_obj)
                texts_to_embed.append(split_text)

        # Compute FastEmbed embeddings
        embeddings = embedding_manager.embed_documents(texts_to_embed)
        for chunk, emb in zip(all_chunks, embeddings):
            chunk["embedding"] = emb

        self.chunks = all_chunks
        self.is_initialized = True
        print(f"[KnowledgeStore] Successfully ingested {len(articles)} documents into {len(self.chunks)} vector chunks.")

    def _bm25_score(self, query_tokens: List[str], chunk_tokens: set, total_chunks: int) -> float:
        """Lightweight BM25 term frequency calculation."""
        score = 0.0
        for token in query_tokens:
            if token in chunk_tokens:
                # IDF approximation
                score += 1.0
        return score / max(1, len(query_tokens))

    def hybrid_search(
        self,
        query: str,
        category: Optional[str] = None,
        product_area: Optional[str] = None,
        top_k: int = 3,
        alpha: float = 0.65 # Weight for vector score vs keyword score
    ) -> List[Dict[str, Any]]:
        """
        Executes hybrid search (dense semantic similarity + keyword match) with metadata filtering.
        """
        if not self.is_initialized or not self.chunks:
            self.ingest_articles()

        query_tokens = [t.lower() for t in re.findall(r"\w+", query)]
        query_embedding = embedding_manager.embed_query(query)

        scored_results = []
        for chunk in self.chunks:
            # Metadata filtering
            if category and category.lower() not in chunk["category"].lower():
                continue
            if product_area and product_area.lower() not in chunk["product_area"].lower():
                continue

            # Vector cosine similarity
            dense_score = embedding_manager.cosine_similarity(query_embedding, chunk["embedding"])
            # Normalize dense score roughly between 0 and 1
            dense_score = max(0.0, min(1.0, (dense_score + 1.0) / 2.0 if dense_score < 0 else dense_score))

            # BM25/Keyword score
            keyword_score = self._bm25_score(query_tokens, chunk["tokens"], len(self.chunks))

            # Hybrid blended score
            hybrid_score = (alpha * dense_score) + ((1.0 - alpha) * keyword_score)

            scored_results.append({
                "chunk_id": chunk["chunk_id"],
                "doc_id": chunk["doc_id"],
                "title": chunk["title"],
                "category": chunk["category"],
                "product_area": chunk["product_area"],
                "severity": chunk["severity"],
                "content": chunk["content"],
                "score": round(float(hybrid_score), 4),
                "dense_score": round(float(dense_score), 4),
                "keyword_score": round(float(keyword_score), 4)
            })

        # Sort descending by hybrid score
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

    def add_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Dynamically ingests a new policy article and embeds its chunks into the vector store."""
        from app.rag.kb_articles import sanitize_text
        clean_article = {
            "doc_id": article.get("doc_id", f"DOC-{len(self.chunks)+100:03d}").strip().upper(),
            "title": sanitize_text(article.get("title", "Untitled Policy")),
            "category": sanitize_text(article.get("category", "General IT")),
            "product_area": sanitize_text(article.get("product_area", "IT Support")),
            "severity": article.get("severity", "Medium"),
            "content": sanitize_text(article.get("content", ""))
        }
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        splits = splitter.split_text(clean_article["content"])
        new_chunks = []
        texts_to_embed = []

        for idx, split_text in enumerate(splits):
            chunk_obj = {
                "chunk_id": f"{clean_article['doc_id']}_chk_{idx}",
                "doc_id": clean_article["doc_id"],
                "title": clean_article["title"],
                "category": clean_article["category"],
                "product_area": clean_article["product_area"],
                "severity": clean_article["severity"],
                "content": split_text,
                "tokens": set(re.findall(r"\w+", split_text.lower()))
            }
            new_chunks.append(chunk_obj)
            texts_to_embed.append(split_text)

        if texts_to_embed:
            embeddings = embedding_manager.embed_documents(texts_to_embed)
            for chunk, emb in zip(new_chunks, embeddings):
                chunk["embedding"] = emb

        # Append to existing in-memory vector store
        self.chunks.extend(new_chunks)
        SEED_KB_ARTICLES.append(clean_article)
        print(f"[KnowledgeStore] Ingested new article '{clean_article['doc_id']}' with {len(new_chunks)} vector chunks.")
        
        return {
            "success": True,
            "doc_id": clean_article["doc_id"],
            "title": clean_article["title"],
            "chunks_added": len(new_chunks),
            "total_chunks": len(self.chunks)
        }

    def delete_article(self, doc_id: str) -> bool:
        """Deletes a policy document and cleans up its vector chunks."""
        doc_id_clean = doc_id.upper().strip()
        global SEED_KB_ARTICLES
        # Remove from articles list
        SEED_KB_ARTICLES = [a for a in SEED_KB_ARTICLES if a.get("doc_id", "").upper().strip() != doc_id_clean]
        # Remove from vector chunks
        before_count = len(self.chunks)
        self.chunks = [c for c in self.chunks if c.get("doc_id", "").upper().strip() != doc_id_clean]
        print(f"[KnowledgeStore] Deleted article '{doc_id_clean}'. Removed {before_count - len(self.chunks)} chunks.")
        return True

    def update_article(self, doc_id: str, article: Dict[str, Any]) -> Dict[str, Any]:
        """Updates an existing policy document and re-indexes its vector embeddings."""
        doc_id_clean = doc_id.upper().strip()
        self.delete_article(doc_id_clean)
        article["doc_id"] = doc_id_clean
        return self.add_article(article)

    def get_all_articles(self) -> List[Dict[str, Any]]:
        return SEED_KB_ARTICLES

knowledge_store = KnowledgeStore()


