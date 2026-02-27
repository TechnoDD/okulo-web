import { PazienteProvider, usePaziente } from '@/providers/paziente';
import { storage, tablesDB } from '@/utils/appwrite';
import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { Query } from 'appwrite';
import { useEffect, useState } from 'react';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const getVisits = createServerFn().handler(async ({ data }) => {
    const { patientId } = data;
    const query = [Query.orderDesc('$createdAt'), Query.limit(5000)];
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
    head: () => ({
        meta: [
            {
                title: 'ViRgo - Gestione Visite',
            },
        ],
    }),
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

function ImmaginiModale({ isOpen, onClose, visita }) {
    const [loadingImages, setLoadingImages] = useState(true);
    const [selectedPair, setSelectedPair] = useState(null);

    // Nomi dei 7 gruppi
    const nomiGruppi = [
        "Confronto completo",
        "Confronto paresi Retto inferiore Dx",
        "Confronto paresi Retto laterale Sx",
        "Confronto paresi Retto mediale Sx",
        "Confronto paresi Retto superiore Dx",
        "Confronto paresi Obq. inferiore Dx",
        "Confronto paresi Obq. superiore Dx"
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

    async function generaPDF(anonymous = false) {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([842, 595]);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const imgSize = 340;
        const centerX = (842 - (imgSize * 2 + 40)) / 2;
        const imgY = 150;

        // COLONNE abbassate per le immagini più grandi
        const datiY = 100;
        const col1X = 50;
        const col2X = 420;
        const labelOffset = 140;

        const datiSinistra = [
            ["Paziente:", anonymous ? `${visita.patient || ""}`.trim().toUpperCase() : `${visita.patientData?.firstName || ""} ${visita.patientData?.lastName || ""}`.trim()],
            ["Sesso:", visita.patientData?.gender || "N/D"],
            ["Età:", visita.patientData?.age || "N/D"],
            ["Data Visita:", visita.visitDate ? new Date(visita.visitDate).toLocaleDateString("it-IT") : "N/D"],
            ["Motivazione:", visita.reason || "N/D"],
        ];

        const datiDestra = [
            ["Patologie:", visita.patientData?.pathologies || "Nessuna"],
            ["Note:", visita.notes || "Nessuna nota"],
        ];

        // Process both images
        const [img1Data, img2Data] = await Promise.all([
            processImageForPDF(selectedPair.img1Src, pdfDoc),
            processImageForPDF(selectedPair.img2Src, pdfDoc)
        ]);

        // ETICHETTE SOPRA (adattate alla nuova dimensione)
        page.drawText("O. S.", {
            x: centerX + (imgSize - 40) / 2,
            y: 500,
            size: 16,
            font: helveticaBoldFont,
            color: rgb(0, 0.6, 0)
        });
        page.drawText("O. D.", {
            x: centerX + imgSize + 40 + (imgSize - 40) / 2,
            y: 500,
            size: 16,
            font: helveticaBoldFont,
            color: rgb(0, 0.6, 0)
        });

        // Immagini più grandi (20% più grandi)
        page.drawImage(img1Data.image, { x: centerX, y: imgY, width: imgSize, height: imgSize });
        page.drawImage(img2Data.image, { x: centerX + imgSize + 40, y: imgY, width: imgSize, height: imgSize });

        // ETICHETTE IN BASSO (adattate)
        const label1Width = helveticaFont.widthOfTextAtSize("Verde davanti all'O. S.", 11);
        const label2Width = helveticaFont.widthOfTextAtSize("Verde davanti all'O. D.", 11);
        page.drawText("Verde davanti all'O. S.", {
            x: centerX + (imgSize - label1Width) / 2,
            y: imgY - 25,
            size: 11,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.6)
        });
        page.drawText("Verde davanti all'O. D.", {
            x: centerX + imgSize + 40 + (imgSize - label2Width) / 2,
            y: imgY - 25,
            size: 11,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.6)
        });

        // LOGO
        const pngImageBytes = await fetch('/logo.png').then((res) => res.arrayBuffer())
        const logo = await pdfDoc.embedPng(pngImageBytes)
        page.drawImage(logo, {
            x: 50,
            y: 548,
            width: 24,
            height: 24
        })
        // TITOLO abbassato per le immagini più grandi
        page.drawText("SCHERMO DI HESS", {
            x: 80,
            y: 550,
            size: 28,
            font: helveticaBoldFont,
            color: rgb(0, 0.2, 0.6),
        });
        // SEPARATORE
        page.drawLine({ start: { x: 50, y: 540 }, end: { x: 792, y: 540 }, thickness: 1.5, color: rgb(0.7, 0.7, 0.7) });

        // Colonne sinistra
        datiSinistra.forEach(([label, valore], index) => {
            const yPos = datiY - (index * 16);
            page.drawText(label, {
                x: col1X, y: yPos, size: 12, font: helveticaFont, color: rgb(0.4, 0.4, 0.4)
            });
            const valoreX = col1X + labelOffset;
            page.drawText(valore?.toString() || "", {
                x: valoreX, y: yPos, size: 12, font: helveticaBoldFont, color: rgb(0, 0, 0)
            });
        });

        // Colonne destra
        datiDestra.forEach(([label, valore], index) => {
            const yPos = datiY - (index * 16);
            page.drawText(label, {
                x: col2X, y: yPos, size: 12, font: helveticaFont, color: rgb(0.4, 0.4, 0.4)
            });
            const valoreX = col2X + labelOffset;
            page.drawText(valore?.toString() || "", {
                x: valoreX, y: yPos, size: 12, font: helveticaBoldFont, color: rgb(0, 0, 0)
            });
        });

        // Footer
        const ora = new Date().toLocaleString("it-IT");
        const oraWidth = helveticaFont.widthOfTextAtSize(`Generato: ${ora}`, 10);
        page.drawText(`Generato: ${ora}`, {
            x: (842 - oraWidth) / 2, y: 20, size: 10, font: helveticaFont, color: rgb(0.5, 0.5, 0.5)
        });

        const pdfBytes = await pdfDoc.save();
        const paziente = anonymous ? (visita.patient.toString().toUpperCase()) : (visita.patientData.firstName + "-" + visita.patientData.lastName)
        downloadPDF(pdfBytes, `scheda_${paziente}_${new Date(visita.visitDate).toLocaleDateString("it-IT")}_${selectedPair.nomeCoppia}_${nomiGruppi[selectedPair.gruppoIndex]}.pdf`);
    }
    // Helper function to process images (invariata)
    async function processImageForPDF(imgSrc, pdfDoc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgSrc;

        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Errore caricamento immagine'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        const cropX = 2048;
        const cropY = 0;
        const cropWidth = 2048;
        const cropHeight = 2048;

        ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const croppedBytes = await blob.arrayBuffer();
        const image = await pdfDoc.embedPng(new Uint8Array(croppedBytes));

        return { image };
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
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">SCHERMO DI HESS</h2>
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
                                <button onClick={() => generaPDF()} className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all group shadow-xl" title="Scarica PDF">
                                    <svg className="w-7 h-7 text-white group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4" />
                                    </svg>
                                </button>
                                <button onClick={() => generaPDF(true)} className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all group shadow-xl" title="Scarica PDF">
                                    <svg className="w-7 h-7 text-white group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                                        <g id="SVGRepo_iconCarrier">
                                            <path d="M2.21967 2.21967C1.9534 2.48594 1.9292 2.9026 2.14705 3.19621L2.21967 3.28033L6.25424 7.3149C4.33225 8.66437 2.89577 10.6799 2.29888 13.0644C2.1983 13.4662 2.4425 13.8735 2.84431 13.9741C3.24613 14.0746 3.6534 13.8305 3.75399 13.4286C4.28346 11.3135 5.59112 9.53947 7.33416 8.39452L9.14379 10.2043C8.43628 10.9258 8 11.9143 8 13.0046C8 15.2138 9.79086 17.0046 12 17.0046C13.0904 17.0046 14.0788 16.5683 14.8004 15.8608L20.7197 21.7803C21.0126 22.0732 21.4874 22.0732 21.7803 21.7803C22.0466 21.5141 22.0708 21.0974 21.8529 20.8038L21.7803 20.7197L15.6668 14.6055L15.668 14.604L8.71877 7.65782L8.72 7.656L7.58672 6.52549L3.28033 2.21967C2.98744 1.92678 2.51256 1.92678 2.21967 2.21967ZM12 5.5C10.9997 5.5 10.0291 5.64807 9.11109 5.925L10.3481 7.16119C10.8839 7.05532 11.4364 7 12 7C15.9231 7 19.3099 9.68026 20.2471 13.4332C20.3475 13.835 20.7546 14.0794 21.1565 13.9791C21.5584 13.8787 21.8028 13.4716 21.7024 13.0697C20.5994 8.65272 16.6155 5.5 12 5.5ZM12.1947 9.00928L15.996 12.81C15.8942 10.7531 14.2472 9.10764 12.1947 9.00928Z" fill="#ffffff" />
                                        </g>
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
                            {/* PRIMA IMMAGINE - O. S. */}
                            <div className="flex-1 flex items-center justify-center bg-white/20 rounded-2xl p-4 relative">
                                <img
                                    src={selectedPair.img1Src}
                                    alt="O. S."
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border-4 border-white/50"
                                />
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-1.5 rounded-xl font-bold text-lg border-2 border-white/70 shadow-2xl z-20 whitespace-nowrap">
                                    O. S.
                                </div>
                            </div>
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white to-transparent mx-8"></div>

                            {/* SECONDA IMMAGINE - O. D. */}
                            <div className="flex-1 flex items-center justify-center bg-white/20 rounded-2xl p-4 relative">
                                <img
                                    src={selectedPair.img2Src}
                                    alt="O.D."
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border-4 border-white/50"
                                />
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-4 py-1.5 rounded-xl font-bold text-lg border-2 border-white/70 shadow-2xl z-20 whitespace-nowrap">
                                    O. D.
                                </div>
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

    // 🔍 PAGINAZIONE - Nuovi stati
    const [currentPage, setCurrentPage] = useState(1);
    const visitsPerPage = 3;

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

    // 🔍 LOGICA PAGINAZIONE
    const indexOfLastVisit = currentPage * visitsPerPage;
    const indexOfFirstVisit = indexOfLastVisit - visitsPerPage;
    const currentVisite = filteredVisite.slice(indexOfFirstVisit, indexOfLastVisit);
    const totalPages = Math.ceil(filteredVisite.length / visitsPerPage);

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
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center justify-center gap-4">
                            <img
                                src="/g_arrow.png"
                                alt="Logo"
                                className="w-8 h-8 flex-shrink-0"
                                aria-label="Logo"
                            />
                            <div className="flex flex-col items-start">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#48b671] to-[#48b671] bg-clip-text text-transparent">
                                    Gestione Visite
                                </h1>
                                <p className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#48b671] to-[#48b671] italic">
                                    {pazienteSelezionato
                                        ? `Gestendo: ${pazienteSelezionato.firstName} ${pazienteSelezionato.lastName}`
                                        : "Inserisci, modifica ed elimina le visite"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {pazienteSelezionato && (
                        <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-xl max-w-md mx-auto">
                            <p className="text-xl font-semibold text-[#48b671]">
                                👤 {pazienteSelezionato.firstName} {pazienteSelezionato.lastName}
                            </p>
                            <p className="text-sm text-[#48b671]">
                                CF: {pazienteSelezionato.fiscalCode}
                            </p>
                        </div>
                    )}

                    {pazienteSelezionato && (
                        <button
                            onClick={() => setSoloPazienteSelezionato(!soloPazienteSelezionato)}
                            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all mx-auto block ${soloPazienteSelezionato
                                ? "bg-green-200 text-[#48b671] hover:bg-green-300 shadow-md"
                                : "bg-green-100 text-[#48b671] hover:bg-green-200 shadow-sm"
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
                            <div className="w-12 h-12 bg-gradient-to-r from-[#48b671] to-[#48b671] rounded-2xl flex items-center justify-center mr-4">
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#48b671]">
                                        <option value="">Seleziona...</option>
                                        {pazienti.map(p => (
                                            <option key={p.$id} value={p.$id}>{p.firstName} {p.lastName} - #{p.$id.toString().toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                                    <input type="date" name="visitDate" value={formData.visitDate} onChange={handleChange} required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#48b671]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">status</label>
                                    <select name="status" value={formData.status} onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#48b671]">
                                        <option value="SCHEDULED">Programmata</option>
                                        <option value="CANCELLED">Annullata</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">reason *</label>
                                <input type="text" name="reason" value={formData.reason} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#48b671]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#48b671]" />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" disabled={loading}
                                    className="flex-1 bg-gradient-to-r from-[#48b671] to-[#48b671] text-white py-3 px-6 rounded-xl font-semibold hover:from-[#3d8f5a] disabled:opacity-50 flex items-center justify-center">
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

                    {/* LISTA VISITE CON PAGINAZIONE */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <div className="w-12 h-12 bg-gradient-to-r from-[#48b671] to-[#48b671] rounded-2xl flex items-center justify-center mr-4">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                Elenco Visite
                            </h2>
                            <div className="text-sm font-semibold text-gray-700 bg-[#d9f1e0] px-4 py-2 rounded-xl border border-[#48b671]/20">
                                {currentVisite.length} / {visite.length}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="relative">
                                <input type="text" placeholder="Cerca per reason, note o data..." value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#48b671] bg-gray-50" />
                                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* resto del codice invariato... */}
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
                            // ... tabella e paginazione come prima
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        {/* intestazione tabella */}
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
                                            {currentVisite.map((visita) => (
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
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 🔍 CONTROLLI PAGINAZIONE */}
                                {filteredVisite.length > visitsPerPage && (
                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            Visualizzati {indexOfFirstVisit + 1}-{Math.min(indexOfLastVisit, filteredVisite.length)} di {filteredVisite.length} visite
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
