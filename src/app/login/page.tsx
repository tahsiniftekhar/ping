import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Chat App",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-muted-foreground text-sm">
          Sign in with your phone number — new numbers are registered automatically.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
