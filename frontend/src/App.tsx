import { Route, Routes } from 'react-router-dom'
import { useAuth } from './authContext'
import { ChatResultsPanel } from './components/ChatResultsPanel'
import { ChatWidget } from './components/ChatWidget'
import { Footer } from './components/Footer'
import { NavBar } from './components/NavBar'
import { About } from './pages/About'
import { CreateAccount } from './pages/CreateAccount'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { ProductPage } from './pages/ProductPage'
import { Products } from './pages/Products'

export default function App() {
  const { user } = useAuth()
  // Remount the chat when the shopper logs in or out, so it loads (or drops) their saved history.
  const chatKey = user === undefined ? 'loading' : user ? `user-${user.id}` : 'guest'
  return (
    <div className="site">
      <NavBar />
      <main className="site-main">
        <ChatResultsPanel />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget key={chatKey} />
    </div>
  )
}
