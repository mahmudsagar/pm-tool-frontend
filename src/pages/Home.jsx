import useSyncStore from "@/stores/useSyncStore"

import { Button } from "@/components/ui/button"

const Home = () => {
  const { count, increment, decrement } = useSyncStore();

  return (
    <section className="w-full flex flex-col items-center justify-center gap-4 text-center py-24">
      <h1 className="text-6xl font-bold">Better Notion | Home Page</h1>
      <p>Below is a button component imported via shadcn/ui</p>
      <h1 className="text-3xl font-bold uppercase my-8">Count: {count}</h1>
      <div className="flex items-center justify-center gap-4">
        <Button onClick={increment}>Increase Count</Button>
        <Button onClick={decrement}>Decrese Count</Button>
      </div>
      <Button asChild>
        <a href='/view'>{"Goto View Page ->"}</a>
      </Button>
    </section>
  );
};

export default Home;
