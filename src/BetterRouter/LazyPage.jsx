import { Suspense } from "react";
import { PageLoader } from "@/components/feedback/PageLoader";

// Forwards extra props: the parallel-route drawer clones route elements with { id, setTopMenu }.
export default function LazyPage({ component: Component, fullscreen = false, ...props }) {
  return (
    <Suspense fallback={<PageLoader fullscreen={fullscreen} />}>
      <Component {...props} />
    </Suspense>
  );
}
