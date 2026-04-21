'use server';

import { cookies } from "next/headers";
import { signJWT, verifyJWT } from "../jwt";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "lib/users.json");

// Types used by actions
export interface SignUpParams {
  name: string;
  email: string;
  password?: string;
}

export interface SignInParams {
  email: string;
  password?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

const ONE_WEEK = 60 * 60 * 24 * 7;

async function getUsers(): Promise<any[]> {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

async function saveUsers(users: any[]) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function signUp(params: SignUpParams) {
  const { name, email, password } = params;

  try {
    const users = await getUsers();

    if (users.find((u) => u.email === email)) {
      return {
        success: false,
        message: "User already exists. Please sign in instead.",
      };
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : "";
    const newUser = {
      id: Math.random().toString(36).substring(7),
      name,
      email,
      password: hashedPassword,
    };

    users.push(newUser);
    await saveUsers(users);

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (e: any) {
    console.error("Error creating a user", e);
    return {
      success: false,
      message: "Failed to create an account.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, password } = params;

  try {
    const users = await getUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return {
        success: false,
        message: "User does not exist. Please sign up instead.",
      };
    }

    if (password && user.password) {
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return {
          success: false,
          message: "Invalid credentials.",
        };
      }
    }

    const token = await signJWT({ uid: user.id, email: user.email, name: user.name });
    await setSessionCookie(token);

    return { success: true };
  } catch (e) {
    console.error("Error signing in", e);
    return {
      success: false,
      message: "Failed to sign in.",
    };
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedClaims = await verifyJWT(sessionCookie);
    if (!decodedClaims) return null;

    return {
      id: decodedClaims.uid as string,
      name: decodedClaims.name as string,
      email: decodedClaims.email as string,
    } as User;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}
