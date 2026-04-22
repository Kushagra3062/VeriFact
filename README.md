# VeriFact: AI-Powered Misinformation Combating Platform

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

VeriFact is a full-stack web application designed to combat the spread of misinformation. It leverages a powerful AI pipeline to analyze news, articles, and claims from various sources—including text, URLs, images, and social media—providing users with a detailed, evidence-based verdict on the content's reliability.

![VeriFact Analysis Results](./frontend/public/screenshot.png)
*(Note: You may need to replace this path with the correct path to your screenshot)*

---

## Core Features

-   **Multi-Modal Input**: Analyze content from raw text, web URLs, and uploaded images.
-   **Advanced AI Pipeline**: Utilizes LangChain and Google's Gemini models to perform a multi-step analysis, including summarization, evidence gathering, and verdict generation.
-   **Evidence-Based Verification**: Scans a curated list of trusted news domains using the Tavily search API to find supporting or refuting evidence.
-   **Detailed Explainability**: Provides a comprehensive report including:
  -   A final verdict (e.g., Verified, Misleading, False).
  -   A "Truthfulness Score" for a quick glance at reliability.
  -   A claim-by-claim breakdown of the original text.
  -   Detection of common misinformation techniques (e.g., Sensationalism, Missing Context).
-   **WhatsApp Bot Integration**: Allows users to verify claims on the go via a Twilio-powered WhatsApp interface.
-   **Multilingual Support**: Automatically detects the input language and provides the analysis in the original language.

---

## Tech Stack

| Area      | Technology                                                                                                   |
| :-------- | :----------------------------------------------------------------------------------------------------------- |
| **Frontend**  | [**Next.js**](https://nextjs.org/), [**React**](https://react.dev/), [**Tailwind CSS**](https://tailwindcss.com/) |
| **Backend**   | [**Python**](https://www.python.org/), [**FastAPI**](https://fastapi.tiangolo.com/), [**Uvicorn**](https://www.uvicorn.org/) |
| **AI & Data** | [**LangChain**](https://www.langchain.com/), [**Google Gemini**](https://deepmind.google/technologies/gemini/), [**Tavily Search**](https://tavily.com/), [**Pytesseract (OCR)**](https://pypi.org/project/pytesseract/), [**OpenAI Whisper (Transcription)**](https://openai.com/research/whisper) |
| **Deployment**| [**Vercel**](https://vercel.com/) (Frontend), [**Render**](https://render.com/) (Backend) |

---

## Getting Started (Local Setup)

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [**Git**](https://git-scm.com/)
-   [**Node.js**](https://nodejs.org/) (v18 or later)
-   [**Python**](https://www.python.org/downloads/) (v3.9 or later)
-   **System-Level Dependencies**:
  -   [**Tesseract OCR Engine**](https://github.com/UB-Mannheim/tesseract/wiki): Required for image text extraction. **Make sure to add it to your system's PATH during installation.**
  -   [**FFmpeg**](https://ffmpeg.org/download.html): Required for processing audio/video files. **Make sure to add the `bin` folder to your system's PATH.**

### Installation

1.  **Clone the Repository**
    ```sh
    git clone https://github.com/your-username/your-repository-name.git
    cd your-repository-name
    ```

2.  **Setup the Backend (Python)**
    ```sh
    # Navigate to the backend directory
    cd backend

    # Create and activate a virtual environment
    python -m venv venv
    .\venv\Scripts\activate  # On Windows
    # source venv/bin/activate  # On macOS/Linux

    # Install Python dependencies
    pip install -r requirements.txt

    # Create the environment file
    # Create a new file named .env and paste the contents from the "Environment Variables" section below
    ```

3.  **Setup the Frontend (Next.js)**
    ```sh
    # Navigate to the frontend directory from the root
    cd frontend

    # Install npm packages
    npm install

    # Create the local environment file
    # Create a new file named .env.local and add the following line:
    NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
    ```

4.  **Run the Application**
  -   **Run the Backend Server**: Open a terminal, navigate to the `backend` directory, activate the venv, and run:
      ```sh
      uvicorn server:app --reload
      ```
  -   **Run the Frontend Server**: Open a *second* terminal, navigate to the `frontend` directory, and run:
      ```sh
      npm run dev
      ```
    Your frontend should now be running at `http://localhost:3000`.
