import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import useAuthStore from "@/stores/useAuthStore";
import { useNavigate, useSearchParams } from "react-router-dom";

const OAUTH_ERRORS = {
  oauth_failed: "Social sign-in failed. Please try again.",
  oauth_not_configured: "Social sign-in is not configured on the server.",
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const { login, register, loading } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast({
        title: "Sign-in failed",
        description: OAUTH_ERRORS[error] || "Authentication failed.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        toast({ title: "Login successful" });
        navigate("/");
      } else {
        toast({ 
          title: "Login failed", 
          description: result.error,
          variant: "destructive" 
        });
      }
    } else {
      const result = await register(email, password, name);
      if (result.success) {
        toast({ title: "Registration successful" });
        navigate("/");
      } else {
        toast({ 
          title: "Registration failed", 
          description: result.error,
          variant: "destructive" 
        });
      }
    }
  };

  const startOAuth = (provider) => {
    window.location.href = `${import.meta.env.BN_BASE_URL}/v1/auth/${provider}`;
  };

  return (<div className="flex items-center justify-center h-screen">
    <Card className="w-full  max-w-md">
      <CardHeader>
        <CardTitle>{isLogin ? "Login" : "Register"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Enter your credentials to access your account"
            : "Create an account to get started"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Login" : "Register"}
          </Button>
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => startOAuth("google")}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => startOAuth("github")}
            >
              GitHub
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Need an account? Register" : "Already have an account? Login"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
  );
}
