import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";

// Created once; recreating the router on render would reset navigation state.
const router = createBrowserRouter(routes);

const BetterRouter = () => <RouterProvider router={router} />;

export default BetterRouter;
