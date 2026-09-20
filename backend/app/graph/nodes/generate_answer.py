import unicodedata
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import ServiceDeskState
from app.graph.llm import get_groq_llm

ANSWER_PROMPT = """You are ResolveIQ, a helpful and efficient IT Service Desk assistant.
Your goal is to provide SHORT, SIMPLE, and CRYSTAL-CLEAR answers based on the retrieved documentation.

GUIDELINES FOR YOUR RESPONSE:
1. **Be Concise**: Keep the response brief (2 to 5 short bullet points or numbered steps). Do NOT write long essays, large generic tables, or filler fluff.
2. **Direct & Simple**: Explain steps in simple, plain English that any employee can follow in 30 seconds.
3. **Format Cleanly**:
   - Use bold for key terms (e.g. **Connect**, **WPA3-Enterprise**).
   - Use code formatting for portal addresses, commands, or settings (e.g. `vpn-gateway.company.internal`).
4. **Cite the Source**: Include the document ID in brackets (e.g. `[DOC-VPN-001]`) at the end of the response.
"""

def sanitize_response(text: str) -> str:
    if not text:
        return ""
    replacements = {
        '\u2011': '-', # non-breaking hyphen
        '\u2013': '-', # en-dash
        '\u2014': '-', # em-dash
        '\u2018': "'",
        '\u2019': "'",
        '\u201c': '"',
        '\u201d': '"',
        '\u00a0': ' ',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return unicodedata.normalize('NFKD', text)

async def generate_answer_node(state: ServiceDeskState) -> Dict[str, Any]:
    """Node: generate_answer grounded on retrieved RAG context with concise formatting."""
    latest_message = ""
    for msg in reversed(state.get("messages", [])):
        if msg.get("role") == "user":
            latest_message = msg.get("content", "")
            break

    context_chunks = state.get("retrieved_context", [])
    
    if not context_chunks:
        return {
            "generated_answer": "I could not find matching documentation in our IT knowledge base. Would you like me to create an IT support ticket for you?",
            "citations": []
        }

    formatted_context = ""
    citations = []
    for chunk in context_chunks:
        formatted_context += f"--- Document: {chunk['doc_id']} | Title: {chunk['title']} ---\n{chunk['content']}\n\n"
        citations.append({
            "doc_id": chunk["doc_id"],
            "title": sanitize_response(chunk["title"]),
            "category": sanitize_response(chunk["category"]),
            "product_area": sanitize_response(chunk["product_area"]),
            "severity": chunk["severity"],
            "score": chunk.get("score", 0.0)
        })

    try:
        llm = get_groq_llm(temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=ANSWER_PROMPT),
            HumanMessage(content=f"Documentation:\n{formatted_context}\n\nUser Question: {latest_message}\n\nPlease provide a short, neat, and easy-to-follow reply:")
        ])
        answer_text = sanitize_response(response.content)
    except Exception as e:
        print(f"[generate_answer] LLM call notice: {e}. Fallback answer generated.")
        top_doc = context_chunks[0]
        answer_text = sanitize_response(f"Here is what you need to know from **[{top_doc['doc_id']}] ({top_doc['title']})**:\n\n{top_doc['content'][:250]}...\n\n*Reference: [{top_doc['doc_id']}].*")

    return {
        "generated_answer": answer_text,
        "citations": citations
    }
