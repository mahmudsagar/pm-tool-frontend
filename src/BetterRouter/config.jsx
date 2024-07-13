import App from "@/App";
import Check from "@/pages/Check";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Sheet from "@/pages/sheet";

export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Home />
      },
      {
        path: '/check',
        element: <Check />
      },
      {
        path: '/form/*',
        element: <Form />
      },
    ]
  },
  {
    path: "/sheet",
    element: <Sheet />
  },
  {
    path: "*",
    element: <h1>404</h1>
  }
]

