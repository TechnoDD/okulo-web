import React, { useEffect, useState, useCallback } from 'react';
import { PazienteProvider, usePaziente } from '@/providers/paziente';
import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { tablesDB, storage, ID, Query } from '@/utils/appwrite';

export const getAttachments = createServerFn().handler(async ({ data }) => {
  const { patientId } = data;
  const query = [];
  if (patientId) query.push(Query.equal('patient', patientId))
  return await tablesDB.listRows(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_ATTACHMENTS_TABLE_ID, query);
})

// STEP 1: Crea riga DB con metadati (SERVER-SIDE)
export const createAttachmentRecord = createServerFn().handler(async ({ data }) => {
  const { pazienteId, descrizione, fileName, fileSize, fileType } = data;

  const row = await tablesDB.createRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_ATTACHMENTS_TABLE_ID, 'unique()', {
    patient: pazienteId,
    description: descrizione,
    fileName,
    fileSize: Number(fileSize),
    fileType,
    status: 'pending_upload',  // ← STATUS TEMPORANEO
  });

  return { success: true, rowId: row.$id };
});

// NUOVA FUNZIONE: Elimina documento e riga DB (SERVER-SIDE)
export const deleteAttachment = createServerFn().handler(async ({ data }) => {
  const { rowId, fileId } = data;

  try {
    // 1. Elimina file da storage (se esiste)
    if (fileId) {
      await storage.deleteFile(import.meta.env.VITE_APPWRITE_BUCKET_ID, fileId);
    }

    // 2. Elimina riga dalla tabella
    await tablesDB.deleteRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_ATTACHMENTS_TABLE_ID, rowId);

    return { success: true };
  } catch (error) {
    console.error('Errore eliminazione:', error);
    return { success: false, error: error.message };
  }
});

// SERVER-SIDE: Genera URL di download sicuro
export const getDownloadUrl = createServerFn().handler(async ({ data }) => {
  const { fileId } = data;

  console.log(fileId)

  if (!fileId) {
    throw new Error('File ID mancante');
  }

  // Genera URL di download valido per 1 ora
  const downloadUrl = storage.getFileDownload(
    import.meta.env.VITE_APPWRITE_BUCKET_ID, // bucket ID
    fileId
  );

  console.log(downloadUrl)

  return { downloadUrl };
});

export const Route = createFileRoute('/_authed/documents/')({
  component: GestioneDocumentiWrapper,
});

const initialFormState = {
  $id: null,
  pazienteId: '',
  descrizione: '',
};

function GestioneDocumenti() {
  const routerState = useRouterState();
  const { pazienti, pazienteSelezionato, setPazienteSelezionato } = usePaziente();
  const [documenti, setDocumenti] = useState<any[]>([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [deleting, setDeleting] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [soloPazienteSelezionato, setSoloPazienteSelezionato] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 🔍 PAGINAZIONE - Nuovi stati
  const [currentPage, setCurrentPage] = useState(1);
  const docsPerPage = 5;

  // STEP 2: Upload file e collega a riga esistente (CLIENT-SIDE)
  const completeUpload = useCallback(async (rowId: string, file: File) => {
    try {
      // Upload file con progress
      const uploadedFile = await storage.createFile(
        import.meta.env.VITE_APPWRITE_BUCKET_ID,
        ID.unique(),
        file
      );

      // ✅ AGGIORNA RIGA DB CON fileId - RELAZIONE CREATA!
      await tablesDB.updateRow(
        import.meta.env.VITE_APPWRITE_OKULO_DB_ID,
        import.meta.env.VITE_APPWRITE_ATTACHMENTS_TABLE_ID,
        rowId,
        {
          fileId: uploadedFile.$id,        // ← RELAZIONE 1:1
          status: 'uploaded',
        }
      );

      return uploadedFile.$id;
    } catch (error) {
      // Fallback in caso di errore
      await tablesDB.updateRow(
        import.meta.env.VITE_APPWRITE_OKULO_DB_ID,
        import.meta.env.VITE_APPWRITE_ATTACHMENTS_TABLE_ID,
        rowId,
        { status: 'upload_failed' }
      );
      throw error;
    }
  }, []);

  useEffect(() => {
    const paziente = routerState.location.state?.paziente;
    if (paziente && pazienti.length > 0) {
      setPazienteSelezionato(paziente);
    } else {
      setPazienteSelezionato(null);
    }
  }, [pazienti]);

  const fetchAttachments = async (patientId?: string) => {
    const attachments = await getAttachments({ data: { patientId } });
    setDocumenti([...attachments.rows]);
  };

  useEffect(() => {
    if (pazienteSelezionato && soloPazienteSelezionato) {
      fetchAttachments(pazienteSelezionato.$id);
    } else {
      fetchAttachments();
    }
  }, [pazienteSelezionato, soloPazienteSelezionato]);

  // Pre-compila form con paziente selezionato
  useEffect(() => {
    if (pazienteSelezionato) {
      setFormData(prev => ({ ...prev, pazienteId: pazienteSelezionato.$id }));
    }
  }, [pazienteSelezionato]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pazienteId || !formData.descrizione || !selectedFile) {
      alert("Tutti i campi sono obbligatori");
      return;
    }

    const currentRowId = `upload_${Date.now()}`;
    setLoading(true);
    setUploadProgress({ [currentRowId]: 0 });

    try {
      // 1. CREA RIGA DB (metadati) - ATOMICA E VELOCE
      const metadata = {
        pazienteId: formData.pazienteId,
        descrizione: formData.descrizione,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      };

      const result = await createAttachmentRecord({ data: metadata });

      // 2. UPLOAD FILE E COLLEGA - RELAZIONE 100% GARANTITA
      setUploadProgress(prev => ({ ...prev, [result.rowId]: 50 }));
      await completeUpload(result.rowId, selectedFile!);
      setUploadProgress(prev => ({ ...prev, [result.rowId]: 100 }));

      // 3. Refresh lista
      await fetchAttachments();

      alert('✅ Documento caricato e collegato correttamente!');

    } catch (error) {
      console.error('Errore:', error);
      alert('❌ Errore durante il caricamento');
    } finally {
      setFormData(initialFormState);
      setSelectedFile(null);

      // 🔑 CRITICO: Reset dell'input file HTML nativo
      const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = ''; // ← Questo pulisce visivamente il campo
      }

      setLoading(false);
      setUploadProgress({});
    }
  };

  // NUOVA FUNZIONE: Gestisce eliminazione documento
  const handleDelete = async (rowId: string, fileId: string | undefined) => {
    if (!confirm("⚠️ Sei sicuro di voler eliminare questo documento? L'operazione è irreversibile.")) {
      return;
    }

    setDeleting(prev => ({ ...prev, [rowId]: true }));

    try {
      await deleteAttachment({
        data: { rowId, fileId: fileId || null }
      });

      // Refresh lista documenti
      await fetchAttachments();

      alert('✅ Documento eliminato correttamente!');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert("❌ Errore durante l'eliminazione");
    } finally {
      setDeleting(prev => ({ ...prev, [rowId]: false }));
    }
  };

  // NUOVA FUNZIONE: Gestisce download documento
  const handleDownload = async (doc: any) => {
    if (!doc.fileId || doc.status !== 'uploaded') {
      alert('❌ Documento non disponibile per il download');
      return;
    }

    try {
      // Chiama server function per ottenere URL sicuro
      const { downloadUrl } = await getDownloadUrl({
        data: { fileId: doc.fileId }
      });

      // Crea e clicca link download automaticamente
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName || `documento_${doc.$id}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Errore download:', error);
      alert('❌ Errore durante il download');
    }
  };

  const filteredDocumenti = documenti.filter(doc => {
    const search = searchTerm.toLowerCase();
    const matchSearch = !search ||
      doc.descrizione?.toLowerCase().includes(search) ||
      doc.fileName?.toLowerCase().includes(search) ||
      String(doc.patient || '').includes(search);

    const matchPatient = !soloPazienteSelezionato || doc.patient === pazienteSelezionato?.$id;
    return matchSearch && matchPatient;
  });

  // 🔍 LOGICA PAGINAZIONE
  const indexOfLastDoc = currentPage * docsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - docsPerPage;
  const currentDocumenti = filteredDocumenti.slice(indexOfFirstDoc, indexOfLastDoc);
  const totalPages = Math.ceil(filteredDocumenti.length / docsPerPage);

  const getNomePaziente = (pazienteId: any) => {
    const p = pazienti.find(p => p.$id === pazienteId);
    return p ? `${p.firstName} ${p.lastName}` : `Paziente #${pazienteId}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded': return '✅';
      case 'pending_upload': return '⏳';
      case 'upload_failed': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center justify-center gap-4">
              <img
                src="/f_arrow.png"
                alt="Logo"
                className="w-8 h-8 flex-shrink-0"
                aria-label="Logo"
              />
              <div className="flex flex-col items-start">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#9e427a] to-[#9e427a] bg-clip-text text-transparent">
                  Gestione Documenti
                </h1>
                <p className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#9e427a] to-[#9e427a] italic">
                  {pazienteSelezionato
                    ? `Gestendo: ${pazienteSelezionato.firstName} ${pazienteSelezionato.lastName}`
                    : "Inserisci, modifica ed elimina i documenti"}
                </p>
              </div>
            </div>
          </div>

          {pazienteSelezionato && (
            <div className="mt-4 mb-6 p-4 bg-[#f2d2dc] border border-[#c07a8a] rounded-2xl max-w-2xl mx-auto">
              <p className="text-xl font-semibold" style={{ color: '#9e427a' }}>
                👤 {pazienteSelezionato.firstName} {pazienteSelezionato.lastName}
              </p>
              <p className="text-sm" style={{ color: '#9e427a' }}>
                CF: {pazienteSelezionato.fiscalCode}
              </p>
            </div>
          )}

          {pazienteSelezionato && (
            <button
              onClick={() => setSoloPazienteSelezionato(!soloPazienteSelezionato)}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all mx-auto block ${soloPazienteSelezionato
                ? "bg-[#d98aa0] text-white hover:bg-[#c07383] shadow-md"
                : "bg-[#e6e6f0] text-[#9e427a] hover:bg-[#d6d6e8] shadow-sm"
                }`}
            >
              {soloPazienteSelezionato ? "👁️ Mostra tutti i documenti" : "✅ Solo documenti di questo paziente"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* FORM */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Nuovo Documento</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paziente *</label>
                  <select
                    name="pazienteId"
                    value={formData.pazienteId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  >
                    <option value="">Seleziona...</option>
                    {pazienti.map(p => (
                      <option key={p.$id} value={p.$id}>
                        {p.firstName} {p.lastName} - #{p.$id.toString().toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File *</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-purple-50 file:text-purple-700"
                    required
                  />
                  {selectedFile && (
                    <p className="mt-1 text-xs text-green-600">
                      ✅ {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione *</label>
                <textarea
                  name="descrizione"
                  value={formData.descrizione}
                  onChange={handleChange}
                  rows={3}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 resize-vertical"
                  placeholder="Es. Referto cardiologico, analisi del sangue..."
                />
              </div>
              <button
                type="submit"
                disabled={loading || !formData.pazienteId || !formData.descrizione || !selectedFile}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Caricamento...</span>
                  </>
                ) : (
                  '🚀 Carica Documento'
                )}
              </button>
            </form>
          </div>

          {/* ELENCO CON PAGINAZIONE */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Documenti</h2>
              <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                {currentDocumenti.length} / {documenti.length}
              </span>
            </div>

            <input
              type="text"
              placeholder="Cerca documenti..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-6 focus:ring-2 focus:ring-indigo-500"
            />

            {filteredDocumenti.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nessun documento trovato
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paziente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Stato</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-20">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentDocumenti.map(doc => (
                        <tr key={doc.$id} className="hover:bg-gray-50">
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <div className="font-medium text-gray-900">{getNomePaziente(doc.patient)}</div>
                          </td>
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={doc.description}>
                              {doc.description}
                            </div>
                            {doc.fileName && (
                              <div className="text-xs text-gray-500 mt-1">{doc.fileName}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${doc.status === 'uploaded'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'upload_failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {getStatusIcon(doc.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center space-x-2 justify-center">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleDownload(doc);
                                }}
                                disabled={!doc.fileId || doc.status !== 'uploaded'}
                                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                title="Scarica documento"
                              >
                                {deleting[doc.$id] ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                                ) : (
                                  '⬇️ Scarica'
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(doc.$id, doc.fileId);
                                }}
                                disabled={deleting[doc.$id] || doc.status === 'pending_upload'}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                title="Elimina documento"
                              >
                                {deleting[doc.$id] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
                                    <span>Elim.</span>
                                  </>
                                ) : (
                                  '🗑️ Elimina'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 🔍 CONTROLLI PAGINAZIONE */}
                {filteredDocumenti.length > docsPerPage && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Visualizzati {indexOfFirstDoc + 1}-{Math.min(indexOfLastDoc, filteredDocumenti.length)} di {filteredDocumenti.length} documenti
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Precedente
                      </button>
                      <span className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg">
                        Pagina {currentPage} di {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Successiva
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GestioneDocumentiWrapper() {
  return (
    <PazienteProvider>
      <GestioneDocumenti />
    </PazienteProvider>
  );
}
