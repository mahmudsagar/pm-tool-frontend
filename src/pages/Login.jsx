import { LoginForm } from "@/components/auth/LoginForm";
import { Toaster } from "@/components/ui/toaster";

const LoginPage = () => {
  return (
    <section className="w-full h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
      <Toaster />
    </section>
  );
};

export default LoginPage;
