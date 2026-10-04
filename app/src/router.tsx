import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import RequireAuth from './components/auth/RequireAuth'
import Home from './pages/Home'
import Daftar from './pages/Daftar'
import Masuk from './pages/Masuk'
import Modul from './pages/Modul'
import ModulDetail from './pages/ModulDetail'
import QuizLanding from './pages/QuizLanding'
import QuizSession from './pages/QuizSession'
import Antrean from './pages/Antrean'
import DuelLanding from './pages/DuelLanding'
import Duel from './pages/Duel'
import Hasil from './pages/Hasil'
import Peringkat from './pages/Peringkat'
import Profil from './pages/Profil'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'daftar', element: <Daftar /> },
      { path: 'masuk', element: <Masuk /> },
      { path: 'modul', element: <Modul /> },
      { path: 'modul/:modulId', element: <ModulDetail /> },
      { path: 'quiz', element: <QuizLanding /> },
      { path: 'quiz/:modulId', element: <RequireAuth><QuizSession /></RequireAuth> },
      { path: 'antrean', element: <DuelLanding /> },
      { path: 'antrean/:modulId', element: <RequireAuth><Antrean /></RequireAuth> },
      { path: 'duel/:duelId', element: <RequireAuth><Duel /></RequireAuth> },
      { path: 'hasil/:duelId', element: <RequireAuth><Hasil /></RequireAuth> },
      { path: 'peringkat', element: <Peringkat /> },
      { path: 'profil', element: <RequireAuth><Profil /></RequireAuth> },
    ],
  },
])
