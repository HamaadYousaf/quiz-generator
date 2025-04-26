import textwrap
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
import fitz

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_TOTAL_QUESTIONS = 20


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

        Output format:

        ### Multiple Choice Questions:
        1. Question: ...
        a) Option A
        b) Option B
        c) Option C
        d) Option D
        Answer: b)

        ### True/False Questions:
        1. Statement: ...
        Answer: True

        Be clear and concise in your questions. Do not invent new material outside the lecture notes.
        """

    return textwrap.dedent(prompt).strip()


router = APIRouter()


@router.post("/generate-questions/")
async def generate_questions(
    file: UploadFile = File(...),
    num_mcq: int = Query(0, ge=0, le=20),
    num_tf: int = Query(0, ge=0, le=20),
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

    # Build the prompt using all chunks
    prompt = build_prompt(text_chunks, num_mcq, num_tf)

    return {"prompt": prompt}
