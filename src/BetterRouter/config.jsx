import App from "@/App";
import Check from "@/pages/Check";
import Form from "@/pages/Form";
import Home from "@/pages/Home";

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
    path: "*",
    element: <h1>404</h1>
  }
]

