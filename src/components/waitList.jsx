import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/init";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { validateContactForm } from "../utils/validation";
import "../styles/form.css";

export default function WaitList() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    // Validate form fields
    const validation = validateContactForm(email, null);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Validate that consent is accepted
    if (!consentAccepted) {
      setValidationErrors({ ...validation.errors, consent: 'È necessario accettare il trattamento dei dati per procedere.' });
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      setValidationErrors({ ...validation.errors, name: 'Il nome e cognome sono obbligatori.' });
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists in waitlist
      const waitlistRef = collection(db, 'waitlist');
      const emailSnapshot = await getDocs(query(waitlistRef, where('email', '==', email)));
      alert(emailSnapshot.empty);
      if (!emailSnapshot.empty) {
        alert("Esiste già una richiesta con questa email nella lista d'attesa.");
        setError("Esiste già una richiesta con questa email nella lista d'attesa.");
        setLoading(false);
        return;
      }

      // Save to waitlist
      await addDoc(waitlistRef, {
        name: name.trim(),
        email,
        consentAccepted,
        timestamp: new Date(),
        type: 'corso_crea_per_vendere'
      });

      setSuccess(true);
      setLoading(false);
      
      // Redirect to success page after 3 seconds
      navigate("/wesleycaicedo/success");

    } catch (error) {
      console.error("Error saving to waitlist:", error);
      setError("Errore nel salvare la richiesta. Per favore, riprova.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="app">
        <div className="form-container">
          <div className="form-title">
            <h1>Richiesta Inviata!</h1>
            <p>Ti sei unito alla lista d'attesa per il <strong>Corso: Crea per Vendere</strong>.</p>
            <p>Unisciti alla lista d’attesa per avere l’accesso anticipato al corso su come vendere sui social.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="form-container">
        <div className="form-title">
          <h1>Lista d'Attesa</h1>
          <h2>Corso: Crea per Vendere</h2>
          <p className="waitlist-description">Unisciti alla lista d'attesa per ricevere informazioni sui prossimi corsi e accedere in anteprima alle iscrizioni.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group form-group-1">
            <input
              type="text"
              id="full-name"
              className={`form-input ${validationErrors.name ? "error" : ""}`}
              placeholder="Nome e Cognome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {validationErrors.name && (
              <span className="error-message">{validationErrors.name}</span>
            )}
          </div>

          <div className="form-group form-group-2">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`form-input ${validationErrors.email ? "error" : ""}`}
              placeholder="Email"
              required
            />
            {validationErrors.email && (
              <span className="error-message">{validationErrors.email}</span>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="form-group form-group-3 consent-group">
            <label className="consent-label">
              <input
                type="checkbox"
                className="consent-checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                required
              />
              <span className="consent-text">
                Acconsento al trattamento dei miei dati personali per finalità di marketing e comunicazioni correlate.
              </span>
            </label>
            {validationErrors.consent && (
              <span className="error-message">{validationErrors.consent}</span>
            )}
          </div>

          {error && (
            <div className="error-message general-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-actions">
            <button 
              type="submit" 
              className={`form-submit-btn ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Invio in corso..." : "Unisciti alla Lista d'Attesa"}
            </button>
            
            <button 
              type="button" 
              onClick={() => navigate("/wesleycaicedo")}
              className="form-back-btn"
            >
              ← Torna alla Home
            </button>
          </form>
        </form>
      </div>
    </div>
  );
}
