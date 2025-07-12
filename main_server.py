# from fastapi import FastAPI, File, HTTPException,UploadFile,File
# from pydantic import BaseModel
# from fastapi.middleware.cors import CORSMiddleware
# import io
# import nest_asyncio
# from google.genai import types
# from google import genai
# from groq import Groq

# client = genai.Client(api_key="AIzaSyC2Jik8u5GCOwoh2MUfQksjjCqJF9gLogw")
# g_client = Groq(api_key="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")

# def answer(question):
#     completion = g_client.chat.completions.create(
#         model="llama3-70b-8192",
#         messages=[{"role": "user", "content": question}]
#     )
#     return completion.choices[0].message.content




# users_db = {}
# app=FastAPI()
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_headers=["*"],
#     allow_methods={"*"}
# )


# class QuestionRequest(BaseModel):
#     question: str

# class QuestionResponse(BaseModel):
#     received_question: str

# @app.post("/chat", response_model=QuestionResponse)
# async def get_question(data: QuestionRequest):
#     question = data.question
#     if not question:
#         raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    
#     response = answer(question)
    
#     return QuestionResponse(received_question=response)






# @app.post("/caption-image")
# async def caption_image(file: UploadFile = File(...)):
#     image_bytes = await file.read() 

#     response = client.models.generate_content(
#         model='gemini-2.5-flash',
#         contents=[
#             types.Part.from_bytes(
#                 data=image_bytes,
#                 mime_type=file.content_type  
#             ),
#             'Caption this image.'
#         ]
#     )
#     return {"caption": response.text}




# if __name__ =="__main__":
#     import uvicorn
#     uvicorn.run(app,host="127.0.0.1",port=5000)


# # changed code
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from google.generativeai import types 
# from google import genai
import google.generativeai as genai
from groq import Groq
import nest_asyncio

#  Clients Setup
# client = genai.Client(api_key="AIzaSyC2Jik8u5GCOwoh2MUfQksjjCqJF9gLogw")  # Gemini API
genai.configure(api_key="AIzaSyC2Jik8u5GCOwoh2MUfQksjjCqJF9gLogw")
model = genai.GenerativeModel("gemini-pro")
g_client = Groq(api_key="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")  # Groq LLaMA3 API

# Answer from LLaMA3
def answer(question: str) -> str:
    completion = g_client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": question}]
    )
    return completion.choices[0].message.content

# FastAPI Setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods={"*"}
)

@app.post("/chat")
async def chat_handler(
    question: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    # Case 1: Nothing Provided
    if not question and not file:
        raise HTTPException(status_code=400, detail="Please provide a question or an image.")

    # 🖼 Case 2: Image is present (with or without question)
    if file:
        image_bytes = await file.read()
        prompt = question if question else "Describe the image."

        response = model.generate_content(
            # model='gemini-2.5-flash',
            [
                prompt,
                Part.from_bytes(data=image_bytes, mime_type=file.content_type)
            ]
        )
        return {"received_question": response.text}

    # Case 3: Only Question (Text)
    if question:
        response = answer(question)
        return {"received_question": response}

# Run Server Locally
nest_asyncio.apply()
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)