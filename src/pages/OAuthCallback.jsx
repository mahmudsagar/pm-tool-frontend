import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "@/stores/useAuthStore";
import { useToast } from "@/components/ui/use-toast";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const loginWithToken = useAuthStore((state) => state.loginWithToken);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("token");
    if (!token) {
      toast({
        title: "Sign-in failed",
        description: "Missing authentication token.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      const result = await loginWithToken(token);
      if (result.success) {
        toast({ title: "Login successful" });
        navigate("/", { replace: true });
      } else {
        toast({
          title: "Sign-in failed",
          description: result.error,
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    })();
  }, [searchParams, loginWithToken, navigate, toast]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
