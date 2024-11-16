import Default from "@/layouts/Default";
import Settings from "@/layouts/Settings";
import Check from "@/pages/Check";
import FileManager from "@/pages/FileManager";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Whiteboard from "@/pages/Whiteboard";
import NotFound from "./NotFound";
import Page from "@/pages";

export const routes = [
  {
    path: '/',
    element: <Default />, /** layout element */
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
        path: '/file-manager/:id',
        element: <FileManager />
      },
      {
        path: '/form/*',
        element: <Form />
      },
      {
        path: '/document/:id',
        element: <Page />
      },
      {
        path: '/single/:id',
        element: <Page />
      },
      {
        path: "/sheet/:id",
        element: <Page />
      },
      {
        path: "/whiteboard/*",
        element: <Whiteboard />
      }
    ]
  },
  {
    path: '/settings',
    element: <Settings />,
    children: [
      {
        path: '/settings/',
        element: <Home />
      },
      {
        path: '/settings/check',
        element: <Check />
      },
      {
        path: '/settings/form/*',
        element: <Form />
      },
      {
        path: '/settings/document/:id',
        element: <Page />
      },
    ]
  },

  {
    path: "*",
    element: <NotFound />
  }
]

