import { useRoutes } from "react-router-dom";
import { routes } from "./routes";

const BetterRouter = () => {
  const allRoutes = useRoutes(routes);
  return (
    <>
      {allRoutes}
    </>
  );
};

export default BetterRouter;

