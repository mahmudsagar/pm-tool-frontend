import Default from "@/layouts/Default";
import Settings from "@/layouts/Settings";
import Check from "@/pages/Check";
import FileManager from "@/pages/FileManager";
import Form from "@/pages/Form";
import Home from "@/pages/Home";
import Data from "@/pages/Data";
import NotFound from "./NotFound";
import Page from "@/pages";
import CommentPage from "@/pages/CommentPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import UsersPage from "@/pages/users";
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
        path: '/board/:id',
        element: <Data />
      },
      {
        path: '/check',
        element: <Check />
      },
      {
        path: '/users',
        element: <UsersPage />
      },
      {
        path: '/file-manager/:type/:id',
        element: <FileManager />
      },
      {
        path: '/folder/:id',
        element: <FileManager />
      },
      {
        path: '/group/:id',
        element: <FileManager />
      },
      {
        path: '/space/:id',
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
      },
      {
        path: "/comment/:id",
        element: <CommentPage />
      }
    ]
  },
  {
    path: '/settings',
    element: (<ProtectedRoute>
      <Settings />
    </ProtectedRoute>),
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
    path: '/teams/create',
    element: (<ProtectedRoute>
      <CreateTeam />
    </ProtectedRoute>) 
  },
  {
    path: '/users/:id',
    element: (<ProtectedRoute>
      <TeamDetails />
    </ProtectedRoute>) 
  },
  {
    path: '/users/edit/:id',
    element: (<ProtectedRoute>
      <CreateTeam />
    </ProtectedRoute>) 
  },
  {
    path: "*",
    element: <NotFound />
  }
]

