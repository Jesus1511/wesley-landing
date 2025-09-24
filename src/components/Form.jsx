import React, { useContext, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../appContext'
import { validateContactForm } from '../utils/validation'

import '../styles/form.css'

export default function Form() {
  const navigate = useNavigate()
  const { 
    niche, setNiche, 
    money, setMoney, 
    name, setName, 
    email, setEmail, 
    phone, setPhone, 
    consentAccepted, setConsentAccepted,
    alreadyExists, loadingResponse,
    verifyAccepted,
    vaciarData
  } = useContext(AppContext)
  
  const [validationErrors, setValidationErrors] = useState({})
  const moneySelectRef = useRef(null)

  const revenueOptions = [
    { value: 0, label: 'Seleziona il fatturato' },
    { value: 10000, label: 'Sto iniziando ora' },
    { value: 50000, label: '€10.001 - €50.000' },
    { value: 100000, label: '€50.001 - €100.000' },
    { value: 500000, label: '€100.001 - €500.000' },
    { value: 1000000, label: '€500.001 - €1.000.000' },
    { value: 10000000, label: '+€1.000.000' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar que todos los campos estén completos
    if (!money) {
      moneySelectRef.current?.focus()
      return
    }

    // Validar los campos de contacto
    const validation = validateContactForm(email, phone)
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    // Validar que se haya aceptado el consentimiento
    if (!consentAccepted) {
      setValidationErrors({ ...validation.errors, consent: 'È necessario accettare il trattamento dei dati per procedere.' })
      return
    }
    
    // Limpiar errores si la validación es exitosa
    setValidationErrors({})
    
    console.log('Verificando aceptación...')
    const accepted = await verifyAccepted()
    
    if (accepted == 1) {
      // Guardar email y número en localStorage
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userPhone', phone)
      navigate('/wesleycaicedo/calendar')
      
    }
    else if (accepted == 2) {
      if (localStorage.getItem('userEmail')) {
        localStorage.removeItem('userEmail')
      }
      if (localStorage.getItem('userPhone')) {
        localStorage.removeItem('userPhone')
      }
      navigate('/wesleycaicedo/success')
      vaciarData()
    }

  }

  return (
    <div className="app combined-form single-view">
      {/* Video Section */}
      <div className="video-section">
        <div className="flex justify-center">
          <h1 className="form-name">
            Avere a disposizione un team come il nostro... <span className="highlight">non è per tutti!</span>
          </h1>
          <iframe 
            className="form-video"
            width="480"
            height="280"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Combined Form Section */}
      <form onSubmit={handleSubmit} className="form-container single-form">
        
        {/* Business Details Section */}
        <div className="form-section">
          <h2 className="section-title">Dettagli del tuo Business</h2>
          
          <div className="form-group form-group-1">
            <input
              type="text"
              id="business-description"
              className="form-input"
              placeholder="Di cosa tratta il tuo progetto o Business?"
              value={niche || ''}
              onChange={(e) => setNiche(e.target.value)}
              required
            />
          </div>

          <div className="form-group form-group-2">
            <label htmlFor="revenue" className="form-label">
              Quanto fatturi attualmente all'anno con questo business?
            </label>
            <select
              id="revenue"
              className="form-select"
              value={money || ''}
              onChange={(e) => setMoney(Number(e.target.value))}
              ref={moneySelectRef}
              required
            >
              {revenueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact Details Section */}
        <div className="form-section">
          <h2 className="section-title">Dati di Contatto</h2>
          
          <div className="form-group form-group-3">
            <input
              type="text"
              id="full-name"
              className="form-input"
              placeholder="Nome e Cognome"
              value={name || ''}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group form-group-4">
            <input
              type="email"
              id="email"
              className={`form-input ${validationErrors.email ? 'error' : ''}`}
              placeholder="Email"
              value={email || ''}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {validationErrors.email && (
              <span className="error-message">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group form-group-5">
            <input
              type="tel"
              id="phone"
              className={`form-input ${validationErrors.phone ? 'error' : ''}`}
              placeholder="Cellulare"
              value={phone || ''}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {validationErrors.phone && (
              <span className="error-message">{validationErrors.phone}</span>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="form-group form-group-6 consent-group">
            <label className="consent-label">
              <input
                type="checkbox"
                className="consent-checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                required
              />
              <span className="consent-text">
              Acconsento al trattamento dei miei dati personali per finalità di marketing. I dati saranno utilizzati esclusivamente per rispondere alla presente richiesta e per eventuali comunicazioni di marketing correlate.
              </span>
            </label>
            {validationErrors.consent && (
              <span className="error-message">{validationErrors.consent}</span>
            )}
          </div>
        </div>

        {/* Already Exists Error Message */}
        {alreadyExists && (
          <div className="already-exists-message">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h3 className="error-title">Registrazione già esistente</h3>
              <p className="error-description">
                Risulta già presente una registrazione con questo indirizzo email o numero di telefono. 
                Verifica i tuoi dati o contattaci per assistenza.
              </p>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="form-actions">
          <button type="submit" className={`form-submit-btn ${loadingResponse ? 'disabled loading' : ''}`} disabled={loadingResponse}>
            {loadingResponse ? (
              <>
                <span className="loading-spinner"></span>
                Elaborazione in corso...
              </>
            ) : (
              'Invia richiesta'
            )}
          </button>
          <button 
            type="button" 
            className="form-back-btn"
            onClick={() => navigate('/wesleycaicedo')}
          >
            Torna indietro
          </button>
        </div>
      </form>
    </div>
  )
}
