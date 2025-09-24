import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppContext from "./appContext";

import App from "./components/App";
import Form from "./components/Form";
import Calendar from "./components/Calendar";
import Success from "./components/Success";
import Redirect from "./components/Redirect";
import WaitList from "./components/waitList";

export default function Navigation() {
  return (
    <BrowserRouter>
        <AppContext>
        <Routes basename="/wesleycaicedo">
            <Route path="/" element={<Redirect />} />
            <Route path="/wesleycaicedo" element={<App />} />
            <Route path="/wesleycaicedo/form" element={<Form />} />
            <Route path="/wesleycaicedo/calendar" element={<Calendar />} />
            <Route path="/wesleycaicedo/success" element={<Success />} />
            <Route path="/wesleycaicedo/waitList" element={<WaitList />} />
        </Routes>
        </AppContext>
    </BrowserRouter>
  )
}
