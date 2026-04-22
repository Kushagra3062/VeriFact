# ---------------- Core Imports ----------------
import os
import asyncio
import time
import re
import requests
import json
from dotenv import load_dotenv

# ---------------- LangChain & AI Imports ----------------
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from tavily import TavilyClient

from deep_translator import GoogleTranslator
from langdetect import detect

# ---------------- Text Extraction & Multimedia Imports ----------------
from newspaper import Article, Config
from PIL import Image
import pytesseract
from transformers import pipeline
from moviepy import VideoFileClip


# ---------------- Setup & Configuration ----------------
# --- Load Environment Variables ---
load_dotenv()

# --- API Keys & Tracing ---
os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")
os.environ["LANGCHAIN_TRACING_V2"] = "false" # Disabled to prevent forbidden errors
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LangSmith_API_KEY")
API_KEY_FCTA = os.getenv("FACT_CHECK_API")
TAVILY_API_KEY = os.getenv("TAVILY_API")

# --- Configure Tesseract OCR (if needed, especially for Windows) ---
# Uncomment and set the path if Tesseract is not in your system's PATH
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


# --- Initialize Clients & Models ---
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

# Primary: Gemini | Fallback: Groq (for when Gemini quota is exhausted)
try:
    llm_gemini = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=os.getenv("GEMINI_API_KEY"))
except Exception:
    llm_gemini = None

try:
    llm_groq = ChatGroq(model_name="llama-3.1-8b-instant", groq_api_key=os.getenv("GROQ_API_KEY"))
except Exception:
    llm_groq = None

# Active LLM — start with Gemini, fallback handled at invocation time
llm = llm_gemini or llm_groq

async def invoke_with_fallback(chain_prompt, inputs):
    """Try Gemini first; if rate-limited, fall back to Groq."""
    parser = StrOutputParser()
    for model, name in [(llm_gemini, "Gemini"), (llm_groq, "Groq")]:
        if model is None:
            continue
        try:
            chain = chain_prompt | model | parser
            result = await chain.ainvoke(inputs)
            return result
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate_limit" in err_str:
                print(f"⚠️ {name} rate-limited, trying next model...")
                continue
            else:
                raise
    raise RuntimeError("All LLM providers are unavailable. Please check your API keys and quotas.")

# --- Trusted Domains for Web Search ---
trusted_domains = [
    "bbc.com", "reuters.com", "apnews.com", "npr.org", "pbs.org",
    "gov.in", "politifact.com", "snopes.com", "factcheck.org","altnews.in", "boomlive.in"
]

# ---------------- Text Extraction Functions ----------------
def get_text_from_url(url):
    """Extracts the main article text from a URL."""
    try:

        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
        config = Config()
        config.browser_user_agent = user_agent

        article = Article(url, config=config)
        article.download()
        article.parse()
        print("✅ Text extracted successfully from URL.")
        return article.text
    except Exception as e:
        print(f"❌ Error extracting from URL: {e}")
        return None

def get_text_from_image(uploaded_file):
    """Extracts text from an uploaded image file using OCR."""
    try:

        # To handle the file in memory without saving it permanently

        image = Image.open(uploaded_file)
        text = pytesseract.image_to_string(image)
        print("✅ Text extracted successfully from image.")
        return text
    except Exception as e:
        print(f"❌ Error extracting from image: {e}")
        return None

def get_text_from_media(uploaded_file):
    """Transcribes text from an audio or video file using Whisper."""
    try:
        # Save the uploaded file to a temporary path for processing
        temp_dir = "temp_media"
        os.makedirs(temp_dir, exist_ok=True)
        file_path = os.path.join(temp_dir, uploaded_file.name)

        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())

        print("🎤 Transcribing media file (this may take a moment)...")
        # Check if it's a video file and extract audio
        if file_path.lower().endswith(('.mp4', '.mov', '.avi')):
            video = VideoFileClip(file_path)
            audio_path = os.path.join(temp_dir, "temp_audio.wav")
            video.audio.write_audiofile(audio_path, codec='pcm_s16le')
            media_to_transcribe = audio_path
        else:
            media_to_transcribe = file_path

        transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-base")
        result = transcriber(media_to_transcribe)
        text = result["text"]

        # Clean up temporary files
        os.remove(file_path)
        if 'audio_path' in locals() and os.path.exists(audio_path):
            os.remove(audio_path)
        if not os.listdir(temp_dir):
            os.rmdir(temp_dir)

        print("✅ Transcription complete.")
        return text
    except Exception as e:
        print(f"❌ Error transcribing media: {e}")
        # Clean up in case of error
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        if 'audio_path' in locals() and os.path.exists(audio_path):
            os.remove(audio_path)
        return None

# ---------------- Language Detection & Translation ----------------
def detect_language(text):
    """Detects the language of the input text."""
    return detect(text)

def translate_to_english(text, source_lang):
    return GoogleTranslator(source=source_lang, target="en").translate(text)

# ---------------- Fact-Checking & Web Search Functions ----------------
def fact_check(news):
    """Queries the Google Fact Check API."""
    BASE_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {"query": news, "key": API_KEY_FCTA, "languageCode": "en"}
    response = requests.get(BASE_URL, params=params)
    data = response.json()
    return data.get("claims", [])

def web_search(news):
    """Performs a web search using Tavily on trusted domains."""
    try:
        response = tavily_client.search(
            query=news,
            include_domains=trusted_domains,
            search_depth="advanced",
            include_raw_content=True,
            max_results=5
        )
        docs = [
            Document(
                page_content=(r.get("raw_content") or r.get("content") or "")[:1500],
                metadata={"title": r.get("title", ""), "url": r.get("url", "")}
            ) for r in response.get("results", []) if (r.get("raw_content") or r.get("content"))
        ]
        return docs
    except Exception as e:
        print(f"Tavily search failed: {e}")
        return []

# ---------------- Detection Chain ----------------
detection_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a meticulous fact-checking assistant. "
     "Your task is to analyze whether the given news is true, false, or misleading "
     "based ONLY on the information from the provided sources. "
     "Do not make assumptions or add information not in the sources.\n\n"
     "IMPORTANT RULES:\n"
     "1. Break down the news into smaller sub-claims before deciding.\n"
     "2. If all sub-claims are supported, mark it as True.\n"
     "3. If all sub-claims are refuted, mark it as False.\n"
     "4. If some sub-claims are true and others are false or unverifiable, mark it as Misleading.\n"
     "5. Never output 'True' if even one sub-claim is false.\n"
     "6. If there is insufficient data, mark it as Unverifiable.\n"
     "Give Reasoning strictly in the English. "
     "If the input is Hindi, output in Hindi; if Tamil, output in Tamil, etc.\n\n"),
    ("human",
     "Sources:\n{context}\n\n"
     "News to verify:\n{query}\n\n"
     "user language: {source_language}\n\n"
     "Output Format (strict JSON):\n"
     "{{\n"
     "  \"decision\": \"True / False / Misleading / Unverifiable\",\n"
     "  \"fake_score\": 0-100,\n"
     "  \"reasoning\": \"One short explanation strictly in English, strictly based on sources\"\n"
     "}}")
])

# ---------------- Summarization Prompt ----------------
Summarize_prompt = ChatPromptTemplate.from_messages(
    [
        ("system",
         "You are a helpful and precise assistant. Summarize the given text in 150–200 characters. "
         "Do not add any external information or assumptions. Only use facts explicitly mentioned in the text. "
         "Preserve all important details, names, dates, numbers, and context. "
         "Don't omit critical information that could change the meaning. "
         "Don't add your own opinions or interpretations. "
         "Just focus on summarizing the provided content accurately. "
         "Ensure the summary is clear, concise, and faithful to the original content. "
         "If something is unclear or missing in the input, do not try to infer or create details—just omit them."
         "if the text is already concise, return it as is."),
        ("user", "news:{news}")
    ]
)
summarizer_prompt = Summarize_prompt  # alias for use with invoke_with_fallback

# ---------------- Explanibility Chain ----------------
explainability_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an expert AI explainability assistant. "
     "Your job is to explain how the fact-checking decision was reached. "
     "Break down the news into smaller sub-claims. all the sub claims must be unqiue and atomic resolving all ambiguties. "
     "For each sub-claim, identify which sources support or refute it, "
     "and extract the exact evidence (quotes or facts) from the sources. "
     "If some sub-claims are unverifiable, explain what information is missing. "
     "Do not invent or assume any facts outside the provided sources."
     "Along with decision and reasoning, always identify if the claim uses one or more of these common misinformation techniques:"
     "Conflation (mixing unrelated facts), "
     "Authority Bias (citing a trusted source incorrectly), "
     "Missing Context (cherry-picked facts), "
     "Sensationalism (emotional or exaggerated language), "
     "Fabrication (completely false with no evidence), "
     "Unverified Source (unknown blogs, WhatsApp forwards, etc.)."
     "maximum 5 atomic sub-claims must be generated."
     "all the subclaims must be factual they should not be nonsense."
     "Give output strictly in the user’s original language: {source_language}. "
     "If the input is Hindi, output in Hindi; if Tamil, output in Tamil, etc.\n\n"),
    ("human",
     "Sources:\n{context}\n\n"
     "News to verify:\n{query}\n\n"
     "user language: {source_language}\n\n"
     "Fact-checking Decision:\n{decision}\n\n"
     "Instructions:\n"
     "1. List all atomic sub-claims present in the news.\n"
     "2. For each sub-claim, state whether it is Supported, Refuted, Contradicted, or Unverifiable.\n"
     "   - Provide evidence (short factual snippets from sources).\n"
     "   - Provide the source URL if available.\n"
     "   - Provide a short reasoning sentence explaining *why* the evidence supports/refutes/contradicts the claim "
     "(e.g., 'BBC confirms this exact number', 'No source mentions Mars, only low-Earth orbit').\n"
     "3. If unverifiable, explain what information is missing and why it prevents verification.\n"
     "4. Summarize why the overall decision ({decision}) was reached.\n"
     "5. Give the correct news if it is misleading or false based on evidences.\n"
     "6. Give the Explanatory Tag for the news such as Outdated Information, Exaggeration, Missing Context, Completely False, Accurate, Misleading or Partially True.\n"
     "7. Identify if the claim uses one or more of the common misinformation techniques.\n"
     "8. All the subclaims must be unique and atomic resolving all ambiguties.\n\n"
     "9. output must be strictly in JSON format as shown below.\n\n"
     "10. output should not contain similar sub-claims or duplicate evidences.\n\n"
     "Output Format (strict JSON):\n"
     "{{\n"
     "  \"claim_breakdown\": [\n"
     "    {{\"sub_claim\": \"\", \"status\": \"Supported/Refuted/Contradicted/Unverifiable\", \"evidence\": \"\", \"source_url\": \"\", \"reason_for_decision\":\"\"}}\n"
     "  ],\n"
     "  \"explanation\": \"One short paragraph explaining how the final decision was derived.\",\n"
     "  \"corrected_news\": \"Corrected news if the original was misleading or false, otherwise leave blank.\",\n"
     "  \"explanatory_tag\": \"Outdated Information, Exaggeration, Missing Context, Completely False, Accurate, Misleading or Partially True\",\n"
     "  \"misinformation_techniques\": [\"list of techniques used in the claim, if any, with reasons for detection.\"]\n"
     "}}"
     )
])

# ---------------- Helper Functions ----------------
def format_docs(docs):
    """Concatenate document page_content into a single context string."""
    return "\n\n".join(doc.page_content for doc in docs)

def sanitize_json(text):
    """Clean LLM output for reliable JSON parsing (smart quotes, etc.)."""
    # Replace curly/smart quotes with straight quotes
    text = text.replace('\u201c', '"').replace('\u201d', '"')  # " "
    text = text.replace('\u2018', "'").replace('\u2019', "'")  # ' '
    # Replace en/em dashes with regular hyphens
    text = text.replace('\u2013', '-').replace('\u2014', '-')
    return text

# ---------------- Main Pipeline ----------------
# Note: chains are built dynamically inside invoke_with_fallback()

async def pipeline(news):
    """The main fact-checking pipeline."""
    # Detect and translate if necessary
    source_language = detect_language(news)
    if source_language != "en":
        news = translate_to_english(news, source_language)

    # Step 1: Summarize input text
    print("✍️ Summarizing the claim...")
    concise_news = await invoke_with_fallback(Summarize_prompt, {"news": news})
    print(f"**Generated Summary:** {concise_news}")

    # Step 2 & 3: Run Google Fact Check and Web Search concurrently
    print("🕵️ Searching for evidence...")
    fact_check_task = asyncio.to_thread(fact_check, concise_news)
    web_search_task = asyncio.to_thread(web_search, concise_news)
    fact_check_res, web_res = await asyncio.gather(fact_check_task, web_search_task)

    # Step 4: Process results and generate final verdict
    print("🧠 Analyzing evidence and making a decision...")
    if web_res:
        verdict_output = await invoke_with_fallback(detection_prompt,
            {"context": format_docs(web_res), "query": concise_news,"source_language":source_language}
        )
        try:
            match = re.search(r'\{.*\}', verdict_output, re.DOTALL)
            if match:
                verdict = json.loads(sanitize_json(match.group(0)))
            else:
                raise ValueError("No JSON object found in the model's decision response.")
        except (json.JSONDecodeError, ValueError) as e:
            verdict = {"decision": "Error", "fake_score": 0, "reasoning": f"Failed to parse model's response. Error: {e}. Raw output: '{verdict_output}'"}
            explanation_data = {} # Ensure explanation_data is initialized

        # Only proceed to explanation if verdict was parsed successfully
        if verdict.get("decision") != "Error":
            explanation = await invoke_with_fallback(explainability_prompt,
                {"context": format_docs(web_res), "query": concise_news, "decision": verdict.get("decision"),"source_language":source_language}
            )
            try:
                match = re.search(r'\{.*\}', explanation, re.DOTALL)
                if match:
                    explanation_data = json.loads(sanitize_json(match.group(0)))
                else:
                    raise ValueError("No JSON object found in the model's explanation response.")
            except (json.JSONDecodeError, ValueError) as e:
                explanation_data = {"claim_breakdown": [], "explanation": f"Failed to parse explanation. Error: {e}. Raw output: '{explanation}'"}
    else:
        verdict = {
            "decision": "Unverifiable",
            "fake_score": 50,
            "reasoning": "Could not find sufficient information from trusted web sources to verify the claim."
        }
        explanation_data = {
            "claim_breakdown": [],
            "explanation": "No web sources were found to analyze the claim."
        }

    # Ensure fake_score is always a number
    if "fake_score" in verdict:
        try:
            verdict["fake_score"] = int(verdict["fake_score"])
        except (ValueError, TypeError):
            verdict["fake_score"] = 0

    # Convert Document objects to plain dicts for JSON serialization
    serialized_web_results = [
        {"title": doc.metadata.get("title", ""), "url": doc.metadata.get("url", "")}
        for doc in web_res
    ] if web_res else []

    return {
        "summary": concise_news,
        "fact_check_api": fact_check_res,
        "web_results": serialized_web_results,
        "final_verdict": verdict,
        "explanation": explanation_data
    }

# ---------------- Streamlit UI (CORRECTED LOGIC) ----------------
# if __name__ == "__main__":
#     st.set_page_config(page_title="AI Fact-Checker", page_icon="📰", layout="wide")
#     st.title("📰 AI Fact-Checker")
#     st.write("Verify news from text, URLs, images, or audio/video files.")

#     raw_text = ""

#     # --- Input Tabs ---
#     tab1, tab2, tab3 = st.tabs(["▶️ Text or URL", "🖼️ Image", "🎤 Audio/Video"])

#     with tab1:
#         text_input = st.text_area("Paste a news article, claim, or URL:", height=200, key="text_input")
#     with tab2:
#         uploaded_image = st.file_uploader("Upload an image file", type=["png", "jpg", "jpeg"], key="image_uploader")
#     with tab3:
#         uploaded_media = st.file_uploader("Upload an audio or video file", type=["mp3", "wav", "mp4", "mov", "avi"], key="media_uploader")


#     # --- Verification Button and Logic ---
#     if st.button("🔍 Verify", use_container_width=True):
#         # This logic block correctly prioritizes the input source and extracts text.
#         # It ensures that no matter which tab is used, the 'raw_text' variable is
#         # populated before the pipeline is called.
#         if text_input.strip():
#             if re.match(r'^https?://', text_input.strip()):
#                 raw_text = get_text_from_url(text_input.strip())
#             else:
#                 raw_text = text_input
#         elif uploaded_image is not None:
#             raw_text = get_text_from_image(uploaded_image)
#         # elif uploaded_media is not None:
#         #     raw_text = get_text_from_media(uploaded_media)

#         # --- THIS SECTION RUNS THE PIPELINE AND DISPLAYS THE FULL REPORT ---
#         # It is now correctly executed for ANY input type, as long as text
#         # was successfully extracted into the 'raw_text' variable.
#         if raw_text and raw_text.strip():
#             st.markdown("---")
#             st.subheader("📊 Fact-Checking In Progress...")

#             start_time = time.time()
#             results = asyncio.run(pipeline(raw_text))
#             end_time = time.time()

#             st.markdown("---")
#             st.subheader("✅ Final Report")

#             verdict = results["final_verdict"]
#             final_explanation = results["explanation"]

#             decision = verdict.get("decision", "N/A")
#             color = {"True": "green", "False": "red", "Misleading": "orange", "Unverifiable": "blue", "Error": "gray"}.get(decision, "gray")

#             st.markdown(f"### Decision: <span style='color:{color};'>{decision}</span>", unsafe_allow_html=True)

#             fake_score = verdict.get("fake_score", 0)
#             st.progress(int(fake_score), text=f"Confidence Score (Likely Fake): {fake_score}%")

#             st.info(f"**Reasoning:**\n{verdict.get('reasoning', 'No reasoning provided.')}")

#             st.write(f"*Analysis completed in {end_time - start_time:.2f} seconds.*")

#             # --- This is the Detailed Explanation section that was previously missing for image/media ---
#             with st.expander("🧐 Detailed Explanation (Explainability)"):
#                 if final_explanation and final_explanation.get("claim_breakdown"):
#                     st.subheader("🔎 Claim-by-Claim Analysis")
#                     st.table(final_explanation["claim_breakdown"])

#                     st.subheader("📌 Overall Explanation")
#                     st.write(final_explanation.get("explanation", "No explanation provided."))
#                     st.write(f"**Explanatory Tag:** {final_explanation.get('explanatory_tag', 'N/A')}")

#                     st.subheader("📝 Corrected News (if applicable)")
#                     corrected_news = final_explanation.get("corrected_news", "").strip()
#                     if corrected_news:
#                         st.write(corrected_news)
#                     else:
#                         st.write("The original news was accurate, or no correction was needed.")

#                     st.subheader("⚠️ Misinformation Techniques Detected")
#                     techniques = final_explanation.get("misinformation_techniques", [])
#                     if techniques:
#                         for tech in techniques:
#                             st.write(f"- {tech}")
#                     else:
#                         st.write("No common misinformation techniques were detected.")
#                 else:
#                     st.write("No detailed explanation was generated. This could be due to an error in parsing the model's response or a lack of sufficient data.")

#             # --- Evidence Sources Expander ---
#             with st.expander("📚 View Evidence Sources"):
#                 st.write("**Web Search Results:**")
#                 if results["web_results"]:
#                     for doc in results["web_results"]:
#                         st.markdown(f"- **{doc.metadata.get('title', 'No Title')}**: [Link]({doc.metadata.get('url', '#')})")
#                 else:
#                     st.write("No web sources were found.")

#                 st.write("**Google Fact-Check API Results:**")
#                 if results["fact_check_api"]:
#                     for claim in results["fact_check_api"][:3]: # Show top 3
#                         review = claim['claimReview'][0]
#                         st.markdown(f"- **Claim:** {claim.get('text', 'N/A')}")
#                         st.markdown(f"  - **Publisher:** {review.get('publisher', {}).get('name', 'N/A')}")
#                         st.markdown(f"  - **Rating:** {review.get('textualRating', 'N/A')}")
#                 else:
#                     st.write("No matching claims found in the Google Fact-Check database.")

#         else:
#             st.error("Please provide an input. No text could be extracted to verify.")
