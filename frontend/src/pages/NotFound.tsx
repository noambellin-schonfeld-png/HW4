import { Link } from 'react-router-dom'
import { Bulldog } from '../components/Bulldog'

export function NotFound() {
  return (
    <div className="page center notfound">
      <Bulldog pose="head" mood="sad" className="sad-dog" title="A sad bulldog" />
      <h1>Ruh-roh. Page not found.</h1>
      <p>This page wandered off campus. Let's get you back to the good stuff.</p>
      <Link to="/" className="btn">
        Back home
      </Link>
    </div>
  )
}
