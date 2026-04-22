# Firebase Setup Guide for VeriFact

To enable the Sign In and Sign Up features, you need to configure Firebase credentials.

## 1. Create a Firebase Project
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Click **Add Project** and follow the steps.
- Enable **Authentication** (Email/Password provider).
- **CRITICAL**: Go to **Firestore Database** in the left sidebar and click **Create database**. 
- Choose a location and start in **Production mode** (or test mode if you prefer).
- (Optional) If you get a "Permission Denied" error in logs, visit the [Google Cloud API Library](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=verifact-1eed2) to ensure the API is enabled.

## 2. Get Admin Credentials (for Server-Side)
- In the Firebase Console, go to **Project Settings** > **Service accounts**.
- Click **Generate new private key**. This downloads a `.json` file.
- Open the `.json` file and locate:
  - `project_id`
  - `client_email`
  - `private_key`

## 3. Get App Configuration (for Client-Side)
- In **Project Settings** > **General**, scroll down to **Your apps**.
- Register a web app if you haven't.
- Copy the `firebaseConfig` values.

## 4. Update `.env.local`
Create or update `frontend/.env.local` with the following values:

```env
# Server-Side Admin (DO NOT prefix with NEXT_PUBLIC_)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-client-email"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Client-Side (MUST prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

> [!IMPORTANT]
> Make sure the `FIREBASE_PRIVATE_KEY` uses `\n` for newlines if you are pasting it into an `.env` file environment. 
