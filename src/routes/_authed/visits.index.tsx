import { PazienteProvider, usePaziente } from '@/providers/paziente';
import { storage, tablesDB } from '@/utils/appwrite';
import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { Query } from 'appwrite';
import { useEffect, useState } from 'react';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const getVisits = createServerFn().handler(async ({ data }) => {
    const { patientId } = data;
    const query = [];
    if (patientId) query.push(Query.equal('patient', patientId))
    return await tablesDB.listRows(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_VISITS_TABLE_ID, query);
})

export const createVisit = createServerFn().handler(async ({ data }) => {
    const {
        patient,
        visitDate,
        reason,
        notes,
        status,
    } = data;

    return await tablesDB.createRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_VISITS_TABLE_ID, 'unique()', {
        patient: patient,
        visitDate: visitDate,
        reason: reason,
        notes: notes,
        status: status
    })
})

export const updateVisit = createServerFn().handler(async ({ data }) => {
    const {
        $id,
        patient,
        visitDate,
        reason,
        notes,
        status,
    } = data;

    return await tablesDB.updateRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_VISITS_TABLE_ID, $id, {
        patient: patient,
        visitDate: visitDate,
        reason: reason,
        notes: notes,
        status: status
    })
})

export const deleteVisit = createServerFn().handler(async ({ data }) => {
    const {
        $id,
    } = data;

    const { comparisons } = await tablesDB.getRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_VISITS_TABLE_ID, $id, [Query.select(['comparisons'])])

    comparisons.forEach(async fileId => {
        await storage.deleteFile(import.meta.env.VITE_APPWRITE_BUCKET_ID, fileId)
    });

    return await tablesDB.deleteRow(import.meta.env.VITE_APPWRITE_OKULO_DB_ID, import.meta.env.VITE_APPWRITE_VISITS_TABLE_ID, $id)
})

export const Route = createFileRoute('/_authed/visits/')({
    component: GestioneVisiteWrapper,
})


const initialFormState = {
    $id: null,
    patient: "",
    visitDate: "",
    reason: "",
    notes: "",
    status: "SCHEDULED",
};


// function ImmaginiModale({ isOpen, onClose, visita }) {
//     const [loadingImages, setLoadingImages] = useState(true);
//     const [selectedImage, setSelectedImage] = useState(null);

//     // Nomi dei 6 gruppi specifici
//     const nomiGruppi = [
//         "Giro completo rosso",
//         "Giro completo verde",
//         "Giro random interno rosso",
//         "Giro random interno verde",
//         "Giro random esterno rosso",
//         "Giro random esterno verde"
//     ];

//     // Genera 42 immagini raggruppate in 6 gruppi
//     const gruppiImmagini = [];
//     const numImmagini = 42;
//     const immaginiPerGruppo = 7;
//     const numGruppi = 6;

//     for (let gruppoIndex = 0; gruppoIndex < numGruppi; gruppoIndex++) {
//         const immaginiGruppo = [];
//         for (let i = 0; i < immaginiPerGruppo; i++) {
//             const immagineIndex = gruppoIndex * immaginiPerGruppo + i;
//             immaginiGruppo.push({
//                 id: immagineIndex + 1,
//                 src: `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_APPWRITE_BUCKET_ID}/files/${visita?.comparisons[immagineIndex]}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}&mode=admin`,
//                 alt: `Immagine ${immagineIndex + 1} - ${nomiGruppi[gruppoIndex]}`
//             });
//         }
//         gruppiImmagini.push({
//             nome: nomiGruppi[gruppoIndex],
//             immagini: immaginiGruppo
//         });
//     }

//     useEffect(() => {
//         if (isOpen) {
//             setLoadingImages(false);
//         }
//     }, [isOpen]);

//     const handleImageClick = (immagine) => {
//         setSelectedImage(immagine);
//     };

//     const closeImageViewer = () => {
//         setSelectedImage(null);
//     };

//     async function generaPDF() {
//         // Crea PDF A4 Landscape (842 x 595 pt)
//         const pdfDoc = await PDFDocument.create();
//         const page = pdfDoc.addPage([842, 595]); // A4 Landscape

//         // Colori e font
//         const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

//         // === SEZIONE LOGO CON PORZIONE SPECIFICA ===
//         const cropX = 2048;      // Pixel da saltare orizzontalmente
//         const cropY = 0;      // Pixel da saltare verticalmente
//         const cropWidth = 2048; // Larghezza porzione da estrarre
//         const cropHeight = 2048; // Altezza porzione da estrarre

//         try {
//             // 1. Carica immagine completa da URL
//             const logoResponse = await fetch(selectedImage.src);
//             const logoBytes = await logoResponse.arrayBuffer();

//             // 2. Crea immagine DOM per dimensioni originali
//             const img = new Image();
//             img.crossOrigin = 'anonymous';
//             img.src = selectedImage.src;

//             await new Promise((resolve, reject) => {
//                 img.onload = () => resolve();
//                 img.onerror = () => reject(new Error('Errore caricamento immagine'));
//             });

//             // 3. ESTRAI PORZIONE con Canvas (senza visualizzarla)
//             const canvas = document.createElement('canvas');
//             canvas.width = cropWidth;
//             canvas.height = cropHeight;
//             const ctx = canvas.getContext('2d');

//             // drawImage(img, xOrig, yOrig, wOrig, hOrig, xDest, yDest, wDest, hDest)
//             ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

//             // 4. Canvas → PNG → Uint8Array per pdf-lib
//             const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
//             const croppedBytes = await blob.arrayBuffer();
//             const logoImage = await pdfDoc.embedPng(new Uint8Array(croppedBytes));

//             // 5. Posiziona porzione estratta (usa dimensioni della porzione)
//             const logoScale = 0.0977;  // Mantieni scala originale o adatta
//             const logoWidth = cropWidth * logoScale;
//             const logoHeight = cropHeight * logoScale;

//             const centerX = (842 - logoWidth) / 2;
//             const centerY = 250;

//             page.drawImage(logoImage, {
//                 x: centerX,
//                 y: centerY,
//                 width: logoWidth,
//                 height: logoHeight,
//             });

//         } catch (e) {
//             console.error('Errore nel caricamento/estrazione porzione logo:', e);
//             // Fallback: usa immagine completa se fallisce
//             try {
//                 const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBytes));
//                 const logoWidth = 6144 * 0.0977;
//                 const logoHeight = 2048 * 0.0977;
//                 const centerX = (842 - logoWidth) / 2;
//                 page.drawImage(logoImage, {
//                     x: centerX,
//                     y: centerY,
//                     width: logoWidth,
//                     height: logoHeight,
//                 });
//             } catch (e2) {
//                 console.error('Fallback logo fallito:', e2);
//             }
//         }

//         // === TITOLO ===
//         page.drawText("SCHEDA MEDICA PAZIENTE", {
//             x: 50,
//             y: 520,
//             size: 24,
//             font: helveticaFont,
//             color: rgb(0, 0.2, 0.6),
//         });

//         // === CAMPi DATI (sotto immagine) ===
//         const datiY = 180;
//         const dati = [
//             ["Paziente:", `${visita.patientData.firstName} ${visita.patientData.lastName}`],
//             ["Data Visita:", new Date(visita.visitDate).toLocaleDateString("it-IT")],
//             ["Motivazione:", visita.reason],
//             ["Note:", visita.notes || "Nessuna nota"],
//         ];

//         dati.forEach(([label, valore], index) => {
//             // Label sinistra
//             page.drawText(label, {
//                 x: 50,
//                 y: datiY - index * 40,
//                 size: 14,
//                 font: helveticaFont,
//                 color: rgb(0.3, 0.3, 0.3),
//             });

//             // Valore destra
//             const valoreWidth = helveticaFont.widthOfTextAtSize(valore, 14);
//             page.drawText(valore, {
//                 x: 750 - valoreWidth,
//                 y: datiY - index * 40,
//                 size: 14,
//                 font: helveticaFont,
//                 color: rgb(0, 0, 0),
//             });
//         });

//         // === LINEE DECORATIVE ===
//         page.drawLine({
//             start: { x: 50, y: 505 },
//             end: { x: 792, y: 505 },
//             thickness: 1,
//             color: rgb(0.8, 0.8, 0.8),
//         });

//         // === DATA/ORA DOCUMENTO ===
//         const ora = new Date().toLocaleString("it-IT");
//         page.drawText(`Generato: ${ora}`, {
//             x: 50,
//             y: 35,
//             size: 10,
//             font: helveticaFont,
//             color: rgb(0.5, 0.5, 0.5),
//         });

//         // === DOWNLOAD ===
//         const pdfBytes = await pdfDoc.save();
//         downloadPDF(
//             pdfBytes,
//             `scheda_paziente_${visita.patientData.firstName}-${visita.patientData.lastName}_${new Date(visita.visitDate).toLocaleDateString("it-IT")}.pdf`,
//         );
//     }

//     function downloadPDF(pdfBytes, filename) {
//         const blob = new Blob([pdfBytes], { type: "application/pdf" });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement("a");
//         link.href = url;
//         link.download = filename;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//     }
//     // >>>>>>>>>>>>> FINE AGGIUNTA <<<<<<<<<<<<<

//     if (!isOpen) return null;

//     return (
//         <>
//             {/* MODALE PRINCIPALE GALLERIA */}
//             <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => {
//                 setSelectedImage(null);
//                 onClose();
//             }}>
//                 <div className="bg-white rounded-3xl shadow-2xl max-w-7xl max-h-[90vh] w-full max-md:w-11/12 overflow-hidden" onClick={(e) => e.stopPropagation()}>
//                     {/* Header modale */}
//                     <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 pb-4 rounded-t-3xl">
//                         <div className="flex items-center justify-between">
//                             <div className="flex items-center">
//                                 <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
//                                     <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                                     </svg>
//                                 </div>
//                                 <div>
//                                     <h2 className="text-2xl font-bold text-white mb-1">
//                                         📸 Immagini Visita ({numImmagini} totali)
//                                     </h2>
//                                     <p className="text-white/90 text-sm font-medium">
//                                         {visita?.reason || 'N/D'} - {new Date(visita?.visitDate).toLocaleDateString() || 'N/D'}
//                                     </p>
//                                 </div>
//                             </div>
//                             <button
//                                 onClick={() => {
//                                     setSelectedImage(null);
//                                     onClose();
//                                 }}
//                                 className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center transition-all group"
//                             >
//                                 <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                                 </svg>
//                             </button>
//                         </div>
//                     </div>

//                     {/* Contenuto modale */}
//                     <div className="p-8 max-h-[70vh] overflow-y-auto">
//                         {loadingImages ? (
//                             <div className="flex items-center justify-center py-20">
//                                 <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
//                                 <span className="ml-3 text-lg text-gray-600 font-medium">Caricamento immagini...</span>
//                             </div>
//                         ) : (
//                             <div className="space-y-8">
//                                 {gruppiImmagini.map((gruppo, gruppoIndex) => (
//                                     <div key={gruppoIndex} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-6 border border-purple-100 shadow-lg">
//                                         {/* Header del gruppo */}
//                                         <div className="flex items-center mb-6 pb-4 border-b border-purple-200">
//                                             <div className="w-12 h-16 bg-gradient-to-r from-red-500 to-green-500 rounded-2xl flex flex-col items-center justify-center mr-4 shadow-lg p-2">
//                                                 <span className="text-lg font-bold text-white">{gruppoIndex + 1}</span>
//                                                 <span className="text-xs text-white/90 font-medium">di 6</span>
//                                             </div>
//                                             <div>
//                                                 <h3 className="text-xl font-bold text-gray-900 leading-tight">
//                                                     {gruppo.nome}
//                                                 </h3>
//                                                 <p className="text-sm text-gray-600 font-medium mt-1">
//                                                     {gruppo.immagini.length} immagini
//                                                 </p>
//                                             </div>
//                                         </div>

//                                         {/* Griglia immagini del gruppo */}
//                                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
//                                             {gruppo.immagini.map((immagine) => (
//                                                 <div
//                                                     key={immagine.id}
//                                                     className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-2 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden border border-gray-100 hover:border-purple-200"
//                                                     onClick={() => handleImageClick(immagine)}
//                                                 >
//                                                     <div className="w-full h-24 sm:h-28 md:h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
//                                                         <img
//                                                             src={immagine.src}
//                                                             alt={immagine.alt}
//                                                             className="w-full h-full object-cover rounded-xl shadow-md group-hover:shadow-2xl transition-all duration-300"
//                                                             loading="lazy"
//                                                         />
//                                                     </div>
//                                                     <p className="text-xs text-gray-600 font-medium mt-2 text-center truncate px-1">
//                                                         #{immagine.id}
//                                                     </p>
//                                                     {/* Overlay hover */}
//                                                     <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-4">
//                                                         <div className="w-full bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl text-center shadow-lg">
//                                                             <svg className="w-5 h-5 inline mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16l5 5m11-1a9 9 0 10-18 0 9 9 0 0018 0z" />
//                                                             </svg>
//                                                             <span className="text-sm font-semibold text-gray-800">Ingrandisci</span>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>

//                     {/* Footer modale */}
//                     <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 rounded-b-3xl">
//                         <div className="flex items-center justify-between">
//                             <div className="text-sm text-gray-600">
//                                 📊 Totale: <span className="font-semibold text-purple-600">{numImmagini}</span> immagini in <span className="font-semibold text-pink-600">{numGruppi}</span> gruppi
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* VIEWER IMMAGINE INGRANDITA */}
//             {selectedImage && (
//                 <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeImageViewer}>
//                     <div className="max-w-4xl max-h-[90vh] w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
//                         {/* Header viewer */}
//                         <div className="flex items-center justify-between p-6 border-b border-white/20">
//                             <div className="flex items-center space-x-3">
//                                 <button
//                                     onClick={closeImageViewer}
//                                     className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center transition-all group"
//                                 >
//                                     <svg className="w-6 h-6 text-white group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//                                     </svg>
//                                 </button>
//                                 <div>
//                                     <p className="text-white text-sm font-medium">
//                                         Immagine #{selectedImage.id}/{numImmagini}
//                                     </p>
//                                     <p className="text-white/80 text-xs">
//                                         {nomiGruppi[Math.floor((selectedImage.id - 1) / 7)]}
//                                     </p>
//                                 </div>
//                             </div>

//                             {/* >>>>>>>>>>>>> Header: bottone Download PDF + X <<<<<<<<<<<<< */}
//                             <div className="flex items-center space-x-3">
//                                 <button
//                                     type="button"
//                                     onClick={generaPDF}
//                                     className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center transition-all group"
//                                     title="Scarica PDF"
//                                 >
//                                     <svg
//                                         className="w-6 h-6 text-white group-hover:scale-110 transition-transform"
//                                         fill="none"
//                                         stroke="currentColor"
//                                         viewBox="0 0 24 24"
//                                     >
//                                         <path
//                                             strokeLinecap="round"
//                                             strokeLinejoin="round"
//                                             strokeWidth={2}
//                                             d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4"
//                                         />
//                                     </svg>
//                                 </button>

//                                 <button
//                                     type="button"
//                                     onClick={closeImageViewer}
//                                     className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center transition-all cursor-pointer"
//                                     title="Chiudi"
//                                 >
//                                     <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                                     </svg>
//                                 </button>
//                             </div>
//                             {/* >>>>>>>>>>>>> FINE AGGIUNTA HEADER <<<<<<<<<<<<< */}
//                         </div>

//                         {/* Immagine ingrandita */}
//                         <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
//                             <img
//                                 src={selectedImage.src}
//                                 alt={selectedImage.alt}
//                                 className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// }

function ImmaginiModale({ isOpen, onClose, visita }) {
    const [loadingImages, setLoadingImages] = useState(true);
    const [selectedPair, setSelectedPair] = useState(null);

    // Nomi dei 7 gruppi
    const nomiGruppi = [
        "Completo",
        "Paresi Retto inferiore Dx",
        "Paresi Retto laterale Sx",
        "Paresi Retto mediale Sx",
        "Paresi Retto superiore Dx",
        "Paresi Obq. inferiore Dx",
        "Paresi Obq. superiore Dx"
    ];

    // Nomi specifici per le COPPIE
    const nomiCoppie = ["Completo", "Random interno", "Random esterno"];

    // ORGANIZZAZIONE COPPIE PER GRUPPO
    const organizzazioneCoppie = [
        [[0, 7], [14, 21], [28, 35]],
        [[1, 8], [15, 22], [29, 36]],
        [[2, 9], [16, 23], [30, 37]],
        [[3, 10], [17, 24], [31, 38]],
        [[4, 11], [18, 25], [32, 39]],
        [[5, 12], [19, 26], [33, 40]],
        [[6, 13], [20, 27], [34, 41]]
    ];

    // Genera 21 pulsanti raggruppati in 7 gruppi
    const gruppiPulsanti = [];
    const numGruppi = 7;

    for (let gruppoIndex = 0; gruppoIndex < numGruppi; gruppoIndex++) {
        const pulsantiGruppo = [];
        const coppieGruppo = organizzazioneCoppie[gruppoIndex];

        coppieGruppo.forEach((coppiaIndici, pulsanteIndex) => {
            const [img1Index, img2Index] = coppiaIndici;
            pulsantiGruppo.push({
                id: gruppoIndex * 3 + pulsanteIndex + 1,
                img1Index,
                img2Index,
                nomeCoppia: nomiCoppie[pulsanteIndex],
                gruppoIndex,
                img1Src: `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_APPWRITE_BUCKET_ID}/files/${visita?.comparisons[img1Index]}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}&mode=admin`,
                img2Src: `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_APPWRITE_BUCKET_ID}/files/${visita?.comparisons[img2Index]}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}&mode=admin`,
                alt: `${nomiCoppie[pulsanteIndex]} - ${nomiGruppi[gruppoIndex]}`
            });
        });

        gruppiPulsanti.push({
            nome: nomiGruppi[gruppoIndex],
            pulsanti: pulsantiGruppo
        });
    }

    useEffect(() => {
        if (isOpen) {
            setLoadingImages(false);
        }
    }, [isOpen]);

    const handlePulsanteClick = (pulsante) => {
        setSelectedPair(pulsante);
    };

    const closeImageViewer = () => {
        setSelectedPair(null);
    };

    async function generaPDF() {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([842, 595]);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const cropX = 2048;
        const cropY = 0;
        const cropWidth = 2048;
        const cropHeight = 2048;

        try {
            const logoResponse = await fetch(selectedPair.img1Src);
            const logoBytes = await logoResponse.arrayBuffer();
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = selectedPair.img1Src;

            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Errore caricamento immagine'));
            });

            const canvas = document.createElement('canvas');
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const croppedBytes = await blob.arrayBuffer();
            const logoImage = await pdfDoc.embedPng(new Uint8Array(croppedBytes));

            const logoScale = 0.0977;
            const logoWidth = cropWidth * logoScale;
            const logoHeight = cropHeight * logoScale;
            const centerX = (842 - logoWidth) / 2;
            const centerY = 250;

            page.drawImage(logoImage, {
                x: centerX,
                y: centerY,
                width: logoWidth,
                height: logoHeight,
            });
        } catch (e) {
            console.error('Errore logo:', e);
        }

        page.drawText("SCHERMO DI HESS", {
            x: 50, y: 520, size: 24, font: helveticaFont, color: rgb(0, 0.2, 0.6),
        });

        const datiY = 180;
        const dati = [
            ["Paziente:", `${visita.patientData.firstName} ${visita.patientData.lastName}`],
            ["Data Visita:", new Date(visita.visitDate).toLocaleDateString("it-IT")],
            ["Motivazione:", visita.reason],
            ["Note:", visita.notes || "Nessuna nota"],
            ["Gruppo:", nomiGruppi[selectedPair.gruppoIndex]],
            ["Tipo Coppia:", selectedPair.nomeCoppia],
            ["Immagini:", `[${selectedPair.img1Index + 1}-${selectedPair.img2Index + 1}]`],
        ];

        dati.forEach(([label, valore], index) => {
            page.drawText(label, { x: 50, y: datiY - index * 35, size: 14, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
            const valoreWidth = helveticaFont.widthOfTextAtSize(valore, 14);
            page.drawText(valore, { x: 750 - valoreWidth, y: datiY - index * 35, size: 14, font: helveticaFont, color: rgb(0, 0, 0) });
        });

        page.drawLine({ start: { x: 50, y: 505 }, end: { x: 792, y: 505 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

        const ora = new Date().toLocaleString("it-IT");
        page.drawText(`Generato: ${ora}`, { x: 50, y: 35, size: 10, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });

        const pdfBytes = await pdfDoc.save();
        downloadPDF(pdfBytes, `scheda_${visita.patientData.firstName}-${visita.patientData.lastName}_${new Date(visita.visitDate).toLocaleDateString("it-IT")}_${selectedPair.nomeCoppia}_${nomiGruppi[selectedPair.gruppoIndex]}.pdf`);
    }

    function downloadPDF(pdfBytes, filename) {
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    if (!isOpen) return null;

    return (
        <>
            {/* MODALE PRINCIPALE */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => {
                setSelectedPair(null);
                onClose();
            }}>
                <div className="bg-white rounded-3xl shadow-2xl max-w-7xl max-h-[90vh] w-full max-md:w-11/12 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 pb-4 rounded-t-3xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">📸 Coppie Immagini Visita</h2>
                                    <p className="text-white/90 text-sm font-medium">{visita?.reason || 'N/D'} - {new Date(visita?.visitDate).toLocaleDateString() || 'N/D'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedPair(null); onClose(); }} className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center transition-all group">
                                <svg className="w-6 h-6 text-white group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-8 max-h-[70vh] overflow-y-auto">
                        {loadingImages ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                                <span className="ml-3 text-lg text-gray-600 font-medium">Caricamento coppie...</span>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {gruppiPulsanti.map((gruppo, gruppoIndex) => (
                                    <div key={gruppoIndex} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-6 border border-purple-100 shadow-lg">
                                        <div className="flex items-center mb-6 pb-4 border-b border-purple-200">
                                            <div className="w-12 h-16 bg-gradient-to-r from-red-500 to-green-500 rounded-2xl flex flex-col items-center justify-center mr-4 shadow-lg p-2">
                                                <span className="text-lg font-bold text-white">{gruppoIndex + 1}</span>
                                                <span className="text-xs text-white/90 font-medium">di 7</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{gruppo.nome}</h3>
                                                <p className="text-sm text-gray-600 font-medium mt-1">{gruppo.pulsanti.length} coppie</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {gruppo.pulsanti.map((pulsante) => (
                                                <div key={pulsante.id} className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden border-2 border-gray-100 hover:border-purple-300 h-fit" onClick={() => handlePulsanteClick(pulsante)}>

                                                    {/* ✅ ANTEPRIMA IMG1 E IMG2 - LAYOUT ORIZZONTALE */}
                                                    <div className="w-full h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl overflow-hidden flex items-center justify-center mb-3 mx-auto">
                                                        <img
                                                            src={pulsante.img1Src}
                                                            alt={`${pulsante.alt} - 1`}
                                                            className="w-1/2 h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                        <div className="w-px h-20 bg-gradient-to-b from-white/50 to-transparent mx-2"></div>
                                                        <img
                                                            src={pulsante.img2Src}
                                                            alt={`${pulsante.alt} - 2`}
                                                            className="w-1/2 h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    </div>

                                                    <div className="text-center mt-3">
                                                        <p className="text-sm font-bold text-gray-800">{pulsante.nomeCoppia}</p>
                                                        <p className="text-xs text-gray-500">[{pulsante.img1Index + 1}-{pulsante.img2Index + 1}]</p>
                                                    </div>

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                                        <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-2xl text-center shadow-2xl">
                                                            <svg className="w-6 h-6 inline mr-2 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16l5 5m11-1a9 9 0 10-18 0 9 9 0 0018 0z" />
                                                            </svg>
                                                            <div>
                                                                <span className="text-lg font-bold text-gray-800 block">Visualizza</span>
                                                                <span className="text-xs text-gray-600 block">{pulsante.nomeCoppia}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 rounded-b-3xl">
                        <div className="text-sm text-gray-600">
                            📊 Totale: <span className="font-semibold text-purple-600">21</span> coppie in <span className="font-semibold text-pink-600">7</span> gruppi
                        </div>
                    </div>
                </div>
            </div>

            {/* VIEWER COPPIA */}
            {selectedPair && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={closeImageViewer}>
                    <div className="max-w-4xl max-h-[90vh] w-full h-full flex flex-col bg-white/10 backdrop-blur-sm rounded-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/30 rounded-t-3xl">
                            <div className="flex items-center space-x-3">
                                <button onClick={closeImageViewer} className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all group">
                                    <svg className="w-7 h-7 text-white group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div>
                                    <p className="text-white text-xl font-bold">{selectedPair.nomeCoppia}</p>
                                    <p className="text-white/90 text-lg">{nomiGruppi[selectedPair.gruppoIndex]}</p>
                                    <p className="text-white/70 text-sm">[Img {selectedPair.img1Index + 1} - Img {selectedPair.img2Index + 1}]</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <button onClick={generaPDF} className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all group shadow-xl" title="Scarica PDF">
                                    <svg className="w-7 h-7 text-white group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4" />
                                    </svg>
                                </button>
                                <button onClick={closeImageViewer} className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all" title="Chiudi">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col p-8 space-y-6 overflow-auto">
                            <div className="flex-1 flex items-center justify-center bg-white/20 rounded-2xl p-4">
                                <img src={selectedPair.img1Src} alt={selectedPair.alt} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border-4 border-white/50" />
                            </div>
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white to-transparent mx-8"></div>
                            <div className="flex-1 flex items-center justify-center bg-white/20 rounded-2xl p-4">
                                <img src={selectedPair.img2Src} alt={selectedPair.alt} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border-4 border-white/50" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function GestioneVisite() {
    const routerState = useRouterState();
    const { pazienti, pazienteSelezionato, setPazienteSelezionato } = usePaziente();
    const [visite, setVisite] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [soloPazienteSelezionato, setSoloPazienteSelezionato] = useState(false);
    const [isImmaginiModaleOpen, setIsImmaginiModaleOpen] = useState(false);
    const [visitaSelezionata, setVisitaSelezionata] = useState(null);

    useEffect(() => {
        const paziente = routerState.location.state?.paziente;

        if (paziente && pazienti.length > 0) {
            setPazienteSelezionato(paziente);
        } else {
            setPazienteSelezionato(null);
        }
    }, [pazienti]);

    useEffect(() => {
        async function fetchVisits(patientId = '') {
            const visits = await getVisits({ data: { patientId } });
            const visitsConPaziente = visits.rows.map(visita => {
                const pazienteTrovato = pazienti.find(p => p.$id === visita.patient);
                return {
                    ...visita,
                    patientData: pazienteTrovato
                };
            });
            setVisite(visitsConPaziente);
        }

        if (pazienteSelezionato && soloPazienteSelezionato) {
            fetchVisits(pazienteSelezionato.$id);
        } else {
            fetchVisits();
        }
    }, [pazienteSelezionato, soloPazienteSelezionato, pazienti]);

    useEffect(() => {
        if (pazienteSelezionato && !isEditing) {
            setFormData(prev => ({ ...prev, patient: pazienteSelezionato.$id }));
        }
    }, [pazienteSelezionato, isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.patient || !formData.visitDate || !formData.reason) {
            alert("Paziente, data e motivo obbligatori");
            return;
        }
        setLoading(true);
        setTimeout(async () => {
            if (isEditing) {
                await updateVisit({ data: formData })
                setVisite(prev => prev.map(v => v.$id === formData.$id ? { ...v, ...formData } : v));
            } else {
                const nuovaVisita = await createVisit({ data: formData })
                const pazienteTrovato = pazienti.find(p => p.$id === formData.patient);
                const nuovaVisitaConPaziente = {
                    ...nuovaVisita,
                    patientData: pazienteTrovato
                };
                setVisite(prev => [nuovaVisitaConPaziente, ...prev]);
            }
            setFormData(initialFormState);
            setIsEditing(false);
            setLoading(false);
        }, 800);
    };

    const handleEdit = (visita) => {
        setFormData({ ...visita, visitDate: new Date(visita.visitDate).toISOString().split('T')[0] });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Elimina questa visita?")) {
            await deleteVisit({ data: { $id: id } });
            setVisite(prev => prev.filter(v => v.$id !== id));
        }
    };

    const handleOpenImmagini = (visita) => {
        setVisitaSelezionata(visita);
        setIsImmaginiModaleOpen(true);
    };

    const handleCancelEdit = () => {
        setFormData(initialFormState);
        setIsEditing(false);
    };

    const filteredVisite = visite.filter(visita => {
        const matchSearch =
            !searchTerm ||
            visita.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visita.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visita.visitDate.includes(searchTerm);

        const matchPaziente = !soloPazienteSelezionato || visita.patient === pazienteSelezionato?.$id;

        return matchSearch && matchPaziente;
    });

    const getfirstNamePaziente = (patient) => {
        if (typeof patient === 'object' && patient.patientData) {
            return `${patient.patientData.firstName} ${patient.patientData.lastName}`;
        }

        const p = pazienti.find(p => p.$id === patient);
        return p ? `${p.firstName} ${p.lastName}` : `Paziente #${patient}`;
    };

    const getstatusBadge = (status) => {
        const classi = {
            SCHEDULED: "bg-blue-100 text-blue-800",
            COMPLETED: "bg-green-100 text-green-800",
            CANCELLED: "bg-red-100 text-red-800"
        };
        return classi[status] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                        Gestione Visite
                    </h1>
                    {pazienteSelezionato && (
                        <div className="mb-6 p-4 bg-emerald-100 border border-emerald-200 rounded-2xl max-w-2xl mx-auto">
                            <p className="text-xl font-semibold text-emerald-800">
                                👤 {pazienteSelezionato.firstName} {pazienteSelezionato.lastName}
                            </p>
                            <p className="text-sm text-emerald-700">CF: {pazienteSelezionato.fiscalCode}</p>
                        </div>
                    )}
                    {pazienteSelezionato && (
                        <button
                            onClick={() => setSoloPazienteSelezionato(!soloPazienteSelezionato)}
                            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all mx-auto block ${soloPazienteSelezionato
                                ? "bg-emerald-200 text-emerald-800 hover:bg-emerald-300 shadow-md"
                                : "bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-sm"
                                }`}
                        >
                            {soloPazienteSelezionato ? "👁️ Mostra tutte le visite" : "✅ Solo visite di questo paziente"}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* FORM */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            {isEditing ? "Modifica Visita" : "Nuova Visita"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Paziente *</label>
                                    <select name="patient" value={formData.patient} onChange={handleChange} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500">
                                        <option value="">Seleziona...</option>
                                        {pazienti.map(p => (
                                            <option key={p.$id} value={p.$id}>#{p.$id.toString().toUpperCase()} - {p.firstName} {p.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                                    <input type="date" name="visitDate" value={formData.visitDate} onChange={handleChange} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">status</label>
                                    <select name="status" value={formData.status} onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500">
                                        <option value="SCHEDULED">Programmata</option>
                                        <option value="COMPLETED">Completata</option>
                                        <option value="CANCELLED">Annullata</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">reason *</label>
                                <input type="text" name="reason" value={formData.reason} onChange={handleChange} required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500" />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-700 disabled:opacity-50 flex items-center justify-center">
                                    {loading ? "Salvando..." : (isEditing ? "Aggiorna" : "Aggiungi")}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={handleCancelEdit}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">
                                        Annulla
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* LISTA VISITE */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mr-4">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                Elenco Visite
                            </h2>
                            <div className="text-sm font-semibold text-gray-700 bg-emerald-100 px-4 py-2 rounded-xl">
                                {filteredVisite.length} / {visite.length}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="relative">
                                <input type="text" placeholder="Cerca per reason, note o data..." value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-gray-50" />
                                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {filteredVisite.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Nessuna visita</h3>
                                <p className="text-gray-500">Aggiungi la prima visita o modifica i filtri</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paziente</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Motivo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stato</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredVisite.map((visita) => (
                                            <tr key={visita.$id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 font-medium text-gray-900">
                                                    {getfirstNamePaziente(visita.patient)}
                                                </td>
                                                <td className="px-4 py-4 text-gray-700">
                                                    {new Date(visita.visitDate).toLocaleDateString() || '-'}
                                                </td>
                                                <td className="px-4 py-4 text-gray-700 max-w-xs truncate" title={visita.reason}>
                                                    {visita.reason}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getstatusBadge(visita.status)}`}>
                                                        {visita.status === 'SCHEDULED' ? '⏰ Program.' :
                                                            visita.status === 'COMPLETED' ? '✅ Comp.' : '❌ Annull.'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleOpenImmagini(visita)}
                                                        className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-lg hover:bg-purple-200 flex items-center space-x-1"
                                                        title="Visualizza immagini"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>Immagini</span>
                                                    </button>
                                                    <button onClick={() => handleEdit(visita)}
                                                        className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-lg hover:bg-emerald-200">
                                                        Modifica
                                                    </button>
                                                    <button onClick={() => handleDelete(visita.$id)}
                                                        className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-lg hover:bg-red-200">
                                                        Elimina
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <ImmaginiModale
                            isOpen={isImmaginiModaleOpen}
                            onClose={() => setIsImmaginiModaleOpen(false)}
                            visita={visitaSelezionata}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function GestioneVisiteWrapper() {
    return (
        <PazienteProvider>
            <GestioneVisite />
        </PazienteProvider>
    );
}
