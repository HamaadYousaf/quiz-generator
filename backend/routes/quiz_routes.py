import json
import textwrap
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
import fitz
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
import os
import asyncio
from dotenv import load_dotenv
from pydantic import BaseModel
from services.auth import get_current_user
from fastapi import Depends
from supabase import create_client


load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

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
    num_mcq: int = Form(...),
    num_tf: int = Form(...),
    user: dict = Depends(get_current_user),
    title: str = Form(...),
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

    if not title:
        title = "Untitled"

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

    try:
        response = (
            supabase.table("quizzes")
            .insert(
                {
                    "user_id": user["user_id"],
                    "title": title,
                    "mc_questions": combined_mcq,
                    "tf_questions": combined_tf,
                }
            )
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500, detail="Failed to insert quiz into database."
            )

        inserted_quiz_id = response.data[0]["id"]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {
        "message": "Quiz generated and saved successfully!",
        "quiz_id": inserted_quiz_id,
        "quiz": final_result,
    }


@router.get("/my-quizzes")
async def get_my_quizzes(user: dict = Depends(get_current_user)):
    try:
        response = (
            supabase.table("quizzes")
            .select("id, title, created_at")
            .eq("user_id", user["user_id"])
            .order("created_at", desc=True)
            .execute()
        )

        if not response.data:
            return {"quizzes": []}

        return {"quizzes": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    try:
        response = (
            supabase.table("quizzes")
            .select("id, title, mc_questions, tf_questions, created_at")
            .eq("id", quiz_id)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Quiz not found.")

        return {"quiz": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.delete("/quiz/{quiz_id}")
async def delete_quiz(quiz_id: str, user: dict = Depends(get_current_user)):
    try:
        # First, check if quiz belongs to the current user
        response = (
            supabase.table("quizzes")
            .select("id")
            .eq("id", quiz_id)
            .eq("user_id", user["user_id"])
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404, detail="Quiz not found or access denied."
            )

        # If quiz exists and user owns it, delete it
        delete_response = supabase.table("quizzes").delete().eq("id", quiz_id).execute()

        if not delete_response.data:
            raise HTTPException(status_code=500, detail="Failed to delete quiz.")

        return {"message": "Quiz deleted successfully."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


class UpdateQuizRequest(BaseModel):
    title: Optional[str] = None
    mc_questions: Optional[List[dict]] = None
    tf_questions: Optional[List[dict]] = None


@router.patch("/quiz/{quiz_id}")
async def update_quiz(
    quiz_id: str, update: UpdateQuizRequest, user: dict = Depends(get_current_user)
):
    try:
        # Step 1: Check if quiz belongs to user
        response = (
            supabase.table("quizzes")
            .select("id")
            .eq("id", quiz_id)
            .eq("user_id", user["user_id"])
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404, detail="Quiz not found or access denied."
            )

        # Step 2: Build the fields to update
        update_data = {}
        if update.title is not None:
            update_data["title"] = update.title
        if update.mc_questions is not None:
            update_data["mc_questions"] = update.mc_questions
        if update.tf_questions is not None:
            update_data["tf_questions"] = update.tf_questions

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided to update.")

        # Step 3: Perform the update
        update_response = (
            supabase.table("quizzes").update(update_data).eq("id", quiz_id).execute()
        )

        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update quiz.")

        return {"message": "Quiz updated successfully."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
