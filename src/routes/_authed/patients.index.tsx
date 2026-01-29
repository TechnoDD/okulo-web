import { getPatients, PazienteProvider, usePaziente } from '@/providers/paziente';
import { account, tablesDB } from '@/utils/appwrite';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';

export const createPatient = createServerFn().handler(async ({ data }) => {
  return await tablesDB.createRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_PATIENTS_TABLE_ID, 'unique()', { firstName: data.firstName, lastName: data.lastName, birthDate: new Date(data.birthDate).toISOString(), fiscalCode: data.fiscalCode, age: data.age, gender: data.gender, pathologies: data.pathologies })
})

export const updatePatient = createServerFn().handler(async ({ data }) => {
  return await tablesDB.updateRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_PATIENTS_TABLE_ID, data.$id, { firstName: data.firstName, lastName: data.lastName, birthDate: new Date(data.birthDate).toISOString(), fiscalCode: data.fiscalCode, age: data.age, gender: data.gender, pathologies: data.pathologies })
})

export const deletePatient = createServerFn().handler(async ({ data }) => {
  return await tablesDB.deleteRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_PATIENTS_TABLE_ID, data.userId)
})

export const Route = createFileRoute('/_authed/patients/')({
  component: GestionePazientiWrapper,
})

const initialFormState = {
  $id: "",
  firstName: "",
  lastName: "",
  age: "",
  gender: "",
  birthDate: "",
  fiscalCode: "",
  pathologies: []
};

function GestionePazienti() {
  const navigate = useNavigate();
  const { pazienti, setPazienti, pazienteSelezionato, setPazienteSelezionato } = usePaziente();

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔍 Leggi patient ID da URL (universale)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient');
    if (patientId && pazienti.length > 0) {
      const paziente = pazienti.find(p => p.$id === parseInt(patientId));
      if (paziente) {
        setPazienteSelezionato(paziente);
      }
    }
  }, [window.location.search, pazienti]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      alert("Nome e Cognome sono obbligatori");
      return;
    }
    setLoading(true);

    try {
      if (isEditing)
        await updatePatient({ data: formData });
      else await createPatient({ data: formData });

      const refreshedPatients = await getPatients();
      setPazienti([...refreshedPatients.rows]);

    } catch (error) {
      console.error('Update failed:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setFormData(initialFormState);
      setIsEditing(false);
      setLoading(false);
    }
  };

  const handleEdit = (paziente) => {
    setFormData({ ...paziente, birthDate: new Date(paziente.birthDate).toISOString().split('T')[0] });
    setIsEditing(true);
    setPazienteSelezionato({ ...paziente, birthDate: new Date(paziente.birthDate).toISOString().split('T')[0] });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo paziente?")) {
      await deletePatient({ data: { userId: id } });
      const refreshedPatients = await getPatients();
      setPazienti([...refreshedPatients.rows]);
      if (pazienteSelezionato?.$id === id) {
        setPazienteSelezionato(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setFormData(initialFormState);
    setIsEditing(false);
  };

  // 🚀 Navigazione UNIVERSALE TanStack Start compatibile
  const navigaConPaziente = (paziente, path) => {
    setPazienteSelezionato(paziente);

    // Costruisci URL con patient ID
    // const url = new URL(path, window.location.origin);
    // url.searchParams.set('patient', paziente.$id);

    // PushState + trigger TanStack Router
    // window.history.pushState({}, '', url.toString());
    // window.dispatchEvent(new PopStateEvent('popstate'));


    navigate({ to: path, search: { patient: paziente.$id }, state: { paziente } });
  };

  const filteredPazienti = pazienti.filter((paziente) =>
    paziente.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paziente.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paziente.fiscalCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Gestione Pazienti
          </h1>
          <p className="text-xl text-gray-600">
            {pazienteSelezionato
              ? `Gestendo: ${pazienteSelezionato.firstName} ${pazienteSelezionato.lastName}`
              : "Inserisci, modifica ed elimina i pazienti"
            }
          </p>
          {pazienteSelezionato && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-xl max-w-md mx-auto">
              <p className="text-xl font-semibold text-blue-800">
                👤 {pazienteSelezionato.firstName} {pazienteSelezionato.lastName}
              </p>
              <p className="text-sm text-blue-700">CF: {pazienteSelezionato.fiscalCode}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* FORM - identico al precedente */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-2xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? "Modifica Paziente" : "Nuovo Paziente"}
              </h2>
            </div>

            {/* <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cognome *</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data di Nascita</label>
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Codice Fiscale</label>
                  <input type="text" name="fiscalCode" value={formData.fiscalCode} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" maxLength="16" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                  {loading ? 'Salvando...' : (isEditing ? "Aggiorna" : "Aggiungi")}
                </button>
                {isEditing && <button type="button" onClick={handleCancelEdit} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">Annulla</button>}
              </div>
            </form> */}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isEditing &&
                  /* ID Paziente */
                  (<div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ID Paziente *</label>
                    <input
                      type="text"
                      name="patientId"
                      value={formData.$id.toString().toUpperCase()}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      required
                    />
                  </div>)}

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>

                {/* Cognome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cognome *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>

                {/* Età */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Età</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="0"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                {/* Sesso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sesso *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    <option value="">Seleziona...</option>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                    <option value="O">Altro</option>
                  </select>
                </div>

                {/* Data di Nascita */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data di Nascita</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                {/* Codice Fiscale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Codice Fiscale</label>
                  <input
                    type="text"
                    name="fiscalCode"
                    value={formData.fiscalCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    maxLength="16"
                  />
                </div>
              </div>

              {/* Patologie - Campi Dinamici con Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Patologie</label>
                <div className="space-y-3 max-w-2xl">
                  {formData.pathologies && formData.pathologies.map((pathology, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <select
                        value={pathology || ''}
                        onChange={(e) => {
                          const newPathologies = [...formData.pathologies];
                          newPathologies[index] = e.target.value;
                          setFormData({ ...formData, pathologies: newPathologies });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="">Seleziona una patologia...</option>
                        <option value="Ipertensione">Ipertensione</option>
                        <option value="Diabete tipo 2">Diabete tipo 2</option>
                        <option value="Allergia penicillina">Allergia penicillina</option>
                        <option value="Asma bronchiale">Asma bronchiale</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const newPathologies = formData.pathologies.filter((_, i) => i !== index);
                          setFormData({ ...formData, pathologies: newPathologies });
                        }}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center h-10"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                  {(!formData.pathologies || formData.pathologies.length === 0) && (
                    <p className="text-gray-500 text-sm italic py-3 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      Nessuna patologia inserita
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPathologies = [...(formData.pathologies || []), ''];
                    setFormData({ ...formData, pathologies: newPathologies });
                  }}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Aggiungi Patologia
                </button>
              </div>

              {/* Pulsanti */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? 'Salvando...' : (isEditing ? "Aggiorna" : "Aggiungi")}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* LISTA PAZIENTI CON NAVIGAZIONE */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Elenco Pazienti</h2>
              </div>
              <div className="text-sm font-semibold text-gray-700 bg-blue-100 px-3 py-1 rounded-full">
                {filteredPazienti.length} / {pazienti.length}
              </div>
            </div>

            <div className="mb-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input type="text" placeholder="Cerca per firstName, lastName o codice fiscale..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cognome</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data di nascita</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cod. Fiscale</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPazienti.map((paziente) => (
                    <tr key={paziente.$id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{paziente.firstName}</td>
                      <td className="px-6 py-4 text-gray-700">{paziente.lastName}</td>
                      <td className="px-6 py-4 text-gray-700">{new Date(paziente.birthDate).toLocaleDateString() || '-'}</td>
                      <td className="px-6 py-4 text-gray-700">{paziente.fiscalCode}</td>
                      <td className="px-6 py-4 space-x-2">
                        <button onClick={() => handleEdit(paziente)}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-md hover:bg-blue-200">
                          Modifica
                        </button>
                        <button onClick={() => navigaConPaziente(paziente, "/visits")}
                          className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-md hover:bg-emerald-200">
                          Visite
                        </button>
                        <button onClick={() => navigaConPaziente(paziente, "/documents")}
                          className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-md hover:bg-purple-200">
                          Documenti
                        </button>
                        <button onClick={() => handleDelete(paziente.$id)}
                          className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-md hover:bg-red-200">
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GestionePazientiWrapper() {
  return (
    <PazienteProvider>
      <GestionePazienti />
    </PazienteProvider>
  );
}