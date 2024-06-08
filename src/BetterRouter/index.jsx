import { useRoutes } from "react-router-dom";
import { routeConfig } from "./config";

const BetterRouter = () => {
  const allRoutes = useRoutes(routeConfig);
  return (
    <>
      {allRoutes}
    </>
  );
};

export default BetterRouter;

