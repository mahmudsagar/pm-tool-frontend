import Default from "@/layouts/Default";
import Settings from "@/layouts/Settings";
import Check from "@/pages/Check";
import Document from "@/pages/document";
import FileManager from "@/pages/FileManager";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Sheet from "@/pages/sheet";
import NotFound from "./NotFound";

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
        path: '/document/*',
        element: <Document />
      },
      {
        path: "/sheet/*",
        element: <Sheet />
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

