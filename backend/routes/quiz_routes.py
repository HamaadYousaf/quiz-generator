import json
import textwrap
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
import fitz
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import os
import asyncio
from dotenv import load_dotenv
from services.auth import get_current_user
from fastapi import Depends


load_dotenv()

router = APIRouter()

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_TOTAL_QUESTIONS = 20
CHUNK_SIZE = 2500  # Max characters per chunk

endpoint = os.getenv("AZURE_ENDPOINT", "https://models.github.ai/inference")
model = os.getenv("AZURE_MODEL", "openai/gpt-4.1")
token = os.getenv("GITHUB_TOKEN")


client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(token),
)


def split_text_into_chunks(text, max_chunk_size=3500):
    paragraphs = text.split("\n")
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) < max_chunk_size:
            current_chunk += para + "\n"
        else:
            chunks.append(current_chunk.strip())
            current_chunk = para + "\n"

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def build_prompt(text_chunks, num_mcq, num_tf):
    """Constructs a full prompt string based on user request."""

    # Merge chunks into one larger text block for the prompt
    merged_text = "\n\n".join(text_chunks)

    prompt = f"""
        You are an expert educational assistant.

        Given the following lecture notes, generate:
        - {num_mcq} Multiple Choice Questions (each with 4 answer choices and the correct answer clearly marked)
        - {num_tf} True/False Questions (clearly stating if the statement is True or False)

        Lecture Notes:
        ---
        {merged_text}
        ---

        ⚠️ Important:
        Output your response **strictly** in the following JSON format:

        {{
        "multiple_choice": [
            {{
            "question": "Your MCQ question here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "The correct option text here"
            }}
        ],
        "true_false": [
            {{
            "statement": "Your True/False statement here",
            "answer": "True"  // or "False"
            }}
        ]
        }}

        ⚠️ Do not include any explanations, headings, or extra text outside the JSON.
        Only output a single valid JSON object.
        """

    return textwrap.dedent(prompt).strip()


async def call_gpt4(prompt: str):
    """Call GitHub Models GPT-4.1 using azure.ai.inference library."""
    response = await asyncio.to_thread(
        client.complete,
        messages=[
            SystemMessage(
                content="You are a helpful AI assistant for generating study quizzes."
            ),
            UserMessage(content=prompt),
        ],
        temperature=0.3,
        top_p=1,
        model=model,
    )
    return response.choices[0].message.content


@router.post("/generate-questions/")
async def generate_questions(
    file: UploadFile = File(...),
    num_mcq: int = Query(0, ge=0, le=20),
    num_tf: int = Query(0, ge=0, le=20),
    user: dict = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF.")

    contents = await file.read()

    if len(contents) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=400, detail="PDF is too large. Maximum allowed size is 10MB."
        )

    if num_mcq + num_tf == 0:
        raise HTTPException(
            status_code=400, detail="You must request at least one question."
        )

    if num_mcq + num_tf > MAX_TOTAL_QUESTIONS:
        raise HTTPException(
            status_code=400, detail="Total number of questions must not exceed 20."
        )

    try:
        pdf_document = fitz.open(stream=contents, filetype="pdf")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {e}")

    extracted_text = ""
    for page in pdf_document:
        extracted_text += page.get_text()
    pdf_document.close()

    text_chunks = split_text_into_chunks(extracted_text)
    total_chunks = len(text_chunks)

    # Distribute questions equally across chunks
    mcq_per_chunk = max(1, num_mcq // total_chunks)
    tf_per_chunk = max(0, num_tf // total_chunks)

    combined_mcq = []
    combined_tf = []

    for chunk in text_chunks:
        prompt = build_prompt(chunk, mcq_per_chunk, tf_per_chunk)
        try:
            response_text = await call_gpt4(prompt)

            # Clean parsing of the response
            try:
                first_pass = json.loads(response_text)

                # If still string inside, double decode
                if isinstance(first_pass, str):
                    parsed_response = json.loads(first_pass)
                else:
                    parsed_response = first_pass
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=500, detail="Model output was not valid JSON."
                )

            # Merge MCQ and T/F into combined lists
            combined_mcq.extend(parsed_response.get("multiple_choice", []))
            combined_tf.extend(parsed_response.get("true_false", []))

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to call GPT-4: {e}")

    final_result = {"multiple_choice": combined_mcq, "true_false": combined_tf}

    return final_result
