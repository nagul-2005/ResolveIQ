import numpy as np
from typing import List
from app.config import settings

class FastEmbedManager:
    _instance = None
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            try:
                from fastembed import TextEmbedding
                cls._model = TextEmbedding(model_name=settings.EMBEDDING_MODEL)
            except Exception as e:
                print(f"[Warning] FastEmbed model loading fallback: {e}")
                cls._model = None
        return cls._model

    @classmethod
    def embed_documents(cls, texts: List[str]) -> List[List[float]]:
        model = cls.get_model()
        if model:
            embeddings = list(model.embed(texts))
            return [e.tolist() if hasattr(e, "tolist") else list(e) for e in embeddings]
        else:
            # Fallback simple deterministic vector for offline / testing if needed
            return [[float((hash(t + str(i)) % 100) / 100.0) for i in range(384)] for t in texts]

    @classmethod
    def embed_query(cls, text: str) -> List[float]:
        res = cls.embed_documents([text])
        return res[0]

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        v1 = np.array(vec1, dtype=np.float32)
        v2 = np.array(vec2, dtype=np.float32)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(v1, v2) / (norm1 * norm2))

embedding_manager = FastEmbedManager()
