# import pickle
# import numpy as np
# from rag.prepare_data import DocumentChunk
# from sqlalchemy.orm import sessionmaker
# # ... engine setup ...

# # Load embeddings from pickle (fast, no DB query needed)
# with open("embeddings.pkl", "rb") as f:
#     ALL_EMBEDDINGS = np.array(pickle.load(f))  # shape: (14929, 384)

# # Load chunk texts from DB once at startup
# session = Session()
# ALL_CHUNKS = [row.chunk_text for row in session.query(DocumentChunk).order_by(DocumentChunk.id).all()]
# session.close()

# print(f"Ready: {len(ALL_CHUNKS)} chunks, {ALL_EMBEDDINGS.shape} embeddings")




import pickle
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "career_mate_dev")
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
Base = declarative_base()

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True)
    chunk_text = Column(String, nullable=False)
    embedding = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

print("Loading embedding model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

print("Loading embeddings from pickle...")
pkl_path = os.path.join(os.path.dirname(__file__), '..', 'embeddings.pkl')
with open(pkl_path, "rb") as f:
    ALL_EMBEDDINGS = np.array(pickle.load(f))

print("Loading chunk texts from DB...")
session = Session()
ALL_CHUNKS = [
    row.chunk_text 
    for row in session.query(DocumentChunk).order_by(DocumentChunk.id).all()
]
session.close()

print(f"RAG service ready: {len(ALL_CHUNKS)} chunks, embeddings shape: {ALL_EMBEDDINGS.shape}")


def retrieve_similar_chunks(cv_text: str, jd_text: str, top_k: int = 3) -> list[dict]:
    # Combine CV + JD into one query string
    query = f"{cv_text[:300]} {jd_text[:300]}"
    
    # Embed the query
    query_vector = model.encode(query)
    
    # Vectorized cosine similarity against all 14929 embeddings at once
    query_norm = query_vector / np.linalg.norm(query_vector)
    matrix_norm = ALL_EMBEDDINGS / np.linalg.norm(ALL_EMBEDDINGS, axis=1, keepdims=True)
    similarities = matrix_norm @ query_norm  # shape: (14929,)
    
    # Get top-k indices
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        results.append({
            "text": ALL_CHUNKS[idx],
            "similarity": float(similarities[idx])
        })
    
    return results



# just for testing
if __name__ == "__main__":
    print("\n--- TEST retrieve_similar_chunks ---")
    test_results = retrieve_similar_chunks(
        cv_text="Python developer 3 years experience Django REST APIs SQL",
        jd_text="Backend engineer needed. Node.js Docker CI/CD REST APIs"
    )
    for i, r in enumerate(test_results, 1):
        print(f"\n{i}. Similarity: {r['similarity']:.4f}")
        print(f"   Text: {r['text'][:120]}...")
    print("\nRAG service test passed.")