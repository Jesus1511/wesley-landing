import { createContext, useState, useEffect } from 'react'
import { db } from './firebase/init'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'

export const AppContext = createContext()

export default function appContext({ children }) {

    const [niche, setNiche] = useState(null)
    const [money, setMoney] = useState(null)

    const [name, setName] = useState(null)
    const [email, setEmail] = useState(null)
    const [phone, setPhone] = useState(null)
    const [consentAccepted, setConsentAccepted] = useState(false)

    const [accepted, setAccepted] = useState(false)
    const [loadingResponse, setLoadingResponse] = useState(false)
    const [alreadyExists, setAlreadyExists] = useState(false)

    useEffect(() => {
      setAlreadyExists(false)
    }, [email, phone])

  const saveRegister = async (acceptedIn) => {
      try {
        console.log('Guardando registro...')
        const registrosRef = collection(db, 'registros')
        const userData = {
          niche,
          money,
          name,
          email,
          phone,
          accepted: acceptedIn,
          timestamp: new Date()
        }
        await addDoc(registrosRef, userData)
        console.log('Registro guardado exitosamente')
      } catch (error) {
        console.error('Error guardando registro:', error)
      }
  }

  const verifyAccepted = async () => {
    if (!niche && !money && !name && !email && !phone) {
      setAccepted(false)
      setAlreadyExists(false)
      return 2
    }
  
    setLoadingResponse(true)
  
    try {
      console.log('Verificando duplicados...')
      const registrosRef = collection(db, 'registros')
  
      // Consultas en paralelo
      const [emailSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(query(registrosRef, where('email', '==', email))),
        getDocs(query(registrosRef, where('phone', '==', phone))),
      ])
  
      if (!emailSnapshot.empty || !phoneSnapshot.empty) {
        console.log('Ya existe un registro con este email o teléfono')
        setAccepted(false)
        setAlreadyExists(true)
        setLoadingResponse(false)
        return 3
      }
  
      if (money <= 50_000) {
        setAccepted(false)
        await saveRegister(false)
        setLoadingResponse(false)
        return 2
      }
  
      console.log('Verificando nicho...')
      
      // Lista de palabras prohibidas traducidas al italiano y ampliada
      const badWords = [
        'pornografia', 'OnlyFans', 'illegale', 'merda', 'droghe', 'spogliarelliste', 'sessualità',
        'sessuali', 'stripchat', 'porno', 'porn', 'pornhub', 'pornhub.com', 'pornhub.it', 'pornhub.es', 'pornhub.fr',
        'escort', 'prostituzione', 'prostituta', 'prostitute', 'bordello', 'bordelli', 'cannabis', 'cocaina', 'eroina',
        'stupefacenti', 'scommesse', 'azzardo', 'slot machine', 'casinò', 'casino', 'truffa', 'scam',
        'arma', 'armi', 'violenza', 'omicidio', 'assassinio', 'pedofilia', 'pedopornografia', 'bestialità', 'zoofilia',
        'incesto', 'droga', 'drogas', 'stripers', 'striptease', 'escort', 'escort service', 'escort girl', 'escort boy',
        'camgirl', 'cam boy', 'camgirl', 'cam', 'camsex', 'cam sex', 'cam sesso', 'cam porno', 'cam show', 'camshows',
        'cam show', 'camshows', 'camgirl', 'camgirls', 'cam boy', 'cam boys', 'cam ragazza', 'cam ragazze', 'cam ragazzo',
        'cam ragazzi', 'sesso a pagamento', 'sesso', 'sex', 'sex work', 'sexworker', 'sex workers', 'sex shop', 'sexshop',
        'sex toys', 'giocattoli sessuali', 'giocattolo sessuale', 'escort', 'escort service', 'escort girl', 'escort boy',
        'escort agency', 'agenzia escort', 'agenzia di escort', 'agenzie escort'
      ]
  
      if (badWords.some(word => niche.toLowerCase().includes(word))) {
        setAccepted(false)
        await saveRegister(false)
        setLoadingResponse(false)
        return 2
      }
  
      setAccepted(true)
      await saveRegister(true)
      setLoadingResponse(false)
      return 1
  
    } catch (error) {
      console.error('Error en verifyAccepted:', error)
      setAccepted(false)
      setLoadingResponse(false)
      return 4
    }
  }
  

    const vaciarData = () => {
      setNiche(null)
      setMoney(null)
      setName(null)
      setEmail(null)
      setPhone(null)
    }

  return (
    <AppContext.Provider value={{ niche, setNiche, money, setMoney, name, setName, email, setEmail, phone, setPhone, consentAccepted, setConsentAccepted, accepted, vaciarData, loadingResponse, alreadyExists, verifyAccepted }}>
      {children}
    </AppContext.Provider>
  )
}
