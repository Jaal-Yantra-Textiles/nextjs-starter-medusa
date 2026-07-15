import { Metadata } from "next"


import LoginTemplate from "@modules/account/templates/login-template"

export const runtime = "edge"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account.",
  robots: { index: false, follow: false },
}

export default function Login() {
  return <LoginTemplate />
}
