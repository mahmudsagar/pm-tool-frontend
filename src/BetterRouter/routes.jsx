import Default from "@/layouts/Default";
import Settings from "@/layouts/Settings";
import Check from "@/pages/Check";
import FileManager from "@/pages/FileManager";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Sheet from "@/pages/sheet";
import Whiteboard from "@/pages/Whiteboard";
import NotFound from "./NotFound";
import { Document } from "@/components/elements/editor";

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
        element: <Document />
      },
      {
        path: '/single/:id',
        element: <Document />
      },
      {
        path: "/sheet/:id",
        element: <Sheet />
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
        path: '/settings/document/*',
        element: <Document />
      },
    ]
  },

  {
    path: "*",
    element: <NotFound />
  }
]

