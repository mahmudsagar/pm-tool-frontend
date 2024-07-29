import App from "@/App";
import Check from "@/pages/Check";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Views from "@/pages/Views";

// error page
import ErrorBoundary from "@/pages/ErrorBoundary";

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
      {
        path: '/views/:viewId',
        element: <Views />
      }
    ]
  },
  {
    path: "*",
    element: <ErrorBoundary />
  }
]

