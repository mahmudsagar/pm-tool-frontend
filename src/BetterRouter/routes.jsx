import Default from "@/layouts/Default";
import Settings from "@/layouts/Settings";
import Check from "@/pages/Check";
import FileManager from "@/pages/FileManager";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Data from "@/pages/Data";
import NotFound from "./NotFound";
import Page from "@/pages";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Teams from "@/pages/teams";
import { LoginForm } from "@/components/auth/LoginForm";
import CreateTeam from "@/pages/teams/Create";
import TeamDetails from "@/pages/teams/TeamDetails";

export const routes = [
  {
    path: '/',
    element: <ProtectedRoute>
      <Default />
    </ProtectedRoute>, /** layout element */
    children: [
      {
        path: '/',
        element: <Home />
      },
      {
        path: '/data',
        element: <Data />
      },
      {
        path: '/check',
        element: <Check />
      },
      {
        path: '/file-manager/:type/:id',
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
        path: "/whiteboard/:id",
        element: <Page />
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
    path: '/login',
    element: <LoginForm />
  },
  {
    path: '/my-teams',
    element: <Teams />
  },
  {
    path: '/teams/create',
    element: <CreateTeam />
  },
  {
    path: '/my-teams/:id',
    element: <TeamDetails />
  },
  {
    path: '/my-teams/edit/:id',
    element: <CreateTeam />
  },
  {
    path: "*",
    element: <NotFound />
  }
]

