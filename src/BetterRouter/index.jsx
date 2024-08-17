import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";

const BetterRouter = () => {
  return (
    <>
      <RouterProvider router={createBrowserRouter(routes)} />
    </>
  );
};

export default BetterRouter;

