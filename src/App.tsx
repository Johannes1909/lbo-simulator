import { useRouteStore } from './state/routeStore'
import { NavBar } from './ui/NavBar'
import { CalculatorPage } from './pages/CalculatorPage'
import { LearnPage } from './pages/LearnPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { SavedPage } from './pages/SavedPage'

function App() {
  const path = useRouteStore((s) => s.path)

  let Page = CalculatorPage
  if (path === '/learn') Page = LearnPage
  else if (path === '/methodology') Page = MethodologyPage
  else if (path === '/saved') Page = SavedPage

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <Page />
    </div>
  )
}

export default App
