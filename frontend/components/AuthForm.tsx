"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import FormField from "@/components/FormField"
import { useRouter } from "next/navigation";


type FormType = "sign-in" | "sign-up";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  })
}

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter()
  const formSchema = authFormSchema(type)

  const form = (useForm as any)({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  }) as any

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (type === "sign-up") {
        const { name, email, password } = values;

        // Call our JWT sign-up API
        const upRes = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const upJson = await upRes.json();
        
        if (!upRes.ok || !upJson?.success) {
          toast.error(upJson?.message || "Failed to create account.");
          return;
        }

        toast.success("Account created successfully. Please sign in.")
        router.push('/sign-in')
      } else {
        const { email, password } = values;

        // Call our JWT sign-in API
        const sessRes = await fetch("/api/auth/sign-in", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const sessJson = await sessRes.json();
        
        if (!sessRes.ok || !sessJson?.success) {
          toast.error(sessJson?.message || "Sign in failed. Check your credentials.");
          return;
        }

        toast.success("Signed in successfully.")
        router.push('/analyser')
      }
    } catch (err) {
      console.log(err)
      toast.error(`There was an error:${err}`)
    }
  }

  const isSignIn = type === "sign-in"

  return (
    <div className="lg:min-w-[566px]">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-8 sm:px-10 py-12 shadow-[0_0_60px_rgba(168,85,247,0.15)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/img.png" alt="VeriFact logo" width={44} height={44} className="rounded-full ring-1 ring-white/10" />
          <h2 className="text-2xl font-bold">VeriFact</h2>
          <p className="text-sm text-gray-300">AI‑powered misinformation analysis</p>
        </div>

        {isSignIn && (
          <div className="mt-6 text-sm text-gray-200 bg-white/5 border border-white/10 rounded-lg p-3">
            You don’t have an account? First
            <Link href="/sign-up" className="ml-1 font-semibold underline decoration-purple-400/50 hover:decoration-purple-400">sign up</Link>
            , then come back here to sign in.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-8">
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="you@example.com"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="********"
              type="password"
            />

            <Button className="w-full mt-2" type="submit">
              {isSignIn ? "Sign In" : "Create account"}
            </Button>
          </form>
        </Form>

        <p className="text-center mt-6 text-sm text-gray-300">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-semibold text-white ml-1 underline decoration-purple-400/50 hover:decoration-purple-400"
          >
            {isSignIn ? "Sign Up" : "Sign In"}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default AuthForm