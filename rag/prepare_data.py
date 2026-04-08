from datasets import load_dataset
import pandas as pd
import re
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv
import os
import pickle
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

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

try:
    Base.metadata.create_all(engine)
    print("connexion ok")
except Exception as e:
    print(f"erreur connexion BD : {e}")
    exit()


print("\n--- Extraction du dataset ---")
dataset = load_dataset("MikePfunk28/resume-training-dataset", split="train")
documents = []
for row in tqdm(dataset, desc="Extraction des conversations"):
    messages = row["messages"]
    conversation = ""
    for msg in messages:
        if msg["role"] in ["user", "assistant"]:
            conversation += f"{msg['role'].capitalize()}: {msg['content']}\n\n"
    if conversation.strip():
        documents.append(conversation.strip())

df = pd.DataFrame({"document": documents})
df.dropna(inplace=True)
df.drop_duplicates(inplace=True)
df = df[df["document"].str.len() > 100]
print(f"taille dataset nettoyé : {df.shape}")


def chunk_text(text, chunk_size=500):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) <= chunk_size:
            current += " " + sentence
        else:
            if current:
                chunks.append(current.strip())
            current = sentence
    if current:
        chunks.append(current.strip())
    return chunks[:3]  

all_chunks = []
for doc in tqdm(df["document"].tolist(), desc="Chunking"):
    chunks = chunk_text(doc)
    all_chunks.extend(chunks)
if len(all_chunks) > 15000:
    all_chunks = all_chunks[:15000]
    print(f"limité à 15000 chunks")

final_df = pd.DataFrame({"text": all_chunks})
final_df["text"] = final_df["text"].str.replace('\x00', '', regex=False)
final_df = final_df[final_df["text"].str.len() > 50]
print(f"nombre de chunks apres nettoyage : {len(final_df)}")
final_df.to_csv("rag_chunks.csv", index=False)


print("\n--- Génération des embeddings ---")
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(final_df["text"].tolist(), show_progress_bar=True)
print(f" embeddings generes : {embeddings.shape}")
    
with open("embeddings.pkl", "wb") as f:
    pickle.dump(embeddings, f)
    print("Embeddings sauvegardés dans embeddings.pkl")


print("\n--- Insertion dans PostgreSQL ---")
session = Session()


session.query(DocumentChunk).delete()

for text, embedding in tqdm(zip(final_df["text"], embeddings), total=len(final_df)):
    clean_text = text.replace('\x00', '')
    chunk = DocumentChunk(
        chunk_text=text,
        embedding=embedding.tolist()
    )

    session.add(chunk)

session.commit()
print(f" {len(final_df)} chunks inseres")


print("\n--- Test de recherche de similarite ---")
def cosine_similarity(vec1, vec2):
    """Calcule la similarite cosinus entre deux vecteurs"""
    import numpy as np
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def search_similar(query_text, limit=5):
    query_embedding = model.encode(query_text)
    all_chunks = session.query(DocumentChunk).all()
    similarities = []
    for chunk in all_chunks:
        sim = cosine_similarity(query_embedding, chunk.embedding)
        similarities.append((chunk.chunk_text, sim))
    
    # trier par similarite decroissante
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    return similarities[:limit]

# test
test_query = "Expérience en développement Python"
results = search_similar(test_query)

print(f"\n Résultats pour: '{test_query}'")
for i, (chunk, similarity) in enumerate(results, 1):
    print(f"\n{i}. Similarite: {similarity:.4f}")
    print(f"   Texte: {chunk[:100]}...")

session.close()
print("\n Termine")