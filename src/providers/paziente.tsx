import { createContext, useContext, useEffect, useState } from "react";

import { tablesDB } from "@/utils/appwrite";
import { createServerFn } from "@tanstack/react-start";

export const getPatients = createServerFn().handler(async () => {
  return await tablesDB.listRows(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_PATIENTS_TABLE_ID);
})

const PazienteContext = createContext(null);

export const PazienteProvider = ({ children }) => {
  const [pazienteSelezionato, setPazienteSelezionato] = useState(null);
  const [pazienti, setPazienti] = useState([]);

  useEffect(() => {
    async function fetchPatients() {
      const patients = await getPatients();
      setPazienti([...patients.rows]);
    }

    fetchPatients()
  })

  const value = {
    pazienti,
    setPazienti,
    pazienteSelezionato,
    setPazienteSelezionato
  };

  return (
    <PazienteContext.Provider value={value}>
      {children}
    </PazienteContext.Provider>
  );
};

export const usePaziente = () => {
  const context = useContext(PazienteContext);
  if (!context) {
    throw new Error("usePaziente deve essere usato dentro PazienteProvider");
  }
  return context;
};