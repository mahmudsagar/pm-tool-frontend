import useSyncStore from "@/stores/useSyncStore"

import { Button } from "@/components/ui/button"

const Check = () => {
  const { count, increment, decrement } = useSyncStore();

  return (
    <section className="w-full flex flex-col items-center justify-center gap-4 text-center bg-slate-100 py-24">
      <h1 className="text-6xl font-bold">Better Notion | Check Page</h1>
      <p>This page is also created with shadcn/ui and to check zustand workers</p>
      <h1 className="text-3xl font-bold uppercase my-8">Count: {count}</h1>
      <div className="flex items-center justify-center gap-4">
        <Button onClick={increment}>Increase Count</Button>
        <Button onClick={decrement}>Decrese Count</Button>
      </div>
      <Button asChild>
        <a href='/'>{'<- Back to Homepage'}</a>
      </Button>
    </section>
  );
};

export default Check;
