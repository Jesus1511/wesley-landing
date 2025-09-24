import { Link } from 'react-router-dom'

export default function Success() {
  return (
    <div className="success-container">
      <div className="success-content">
        {/* Icono de éxito */}
        <div className="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="#ecfdf5"/>
            <path d="m9 12 2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Título principal */}
        <h1 className="success-title">
          Grazie!
        </h1>

        {/* Mensaje principal */}
        <p className="success-message">
          Abbiamo ricevuto le tue informazioni e ti contatteremo presto.
        </p>

        {/* Botón de acción */}
        <div className="success-actions">
          <Link to="/wesleycaicedo" className="success-button primary"
          >
            Torna all'inizio
          </Link>
        </div>
      </div>
    </div>
  )
}
