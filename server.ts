import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limit for file uploads (PDF base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Initialize Firebase App & Firestore using the automatically generated config 1
// Initialize Firebase App & Firestore 2
let db: any = null;
try {
  let firebaseConfig: any = null;

  // 1. On cherche d'abord dans les variables d'environnement (Idéal pour Render)
  if (process.env.FIREBASE_CONFIG) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } 
  // 2. Si absente, on cherche le fichier local (Idéal pour ton développement en local)
  else {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf-8").trim();
      if (fileContent) {
        firebaseConfig = JSON.parse(fileContent);
      }
    }
  }

  if (firebaseConfig) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log(`Firebase initialized successfully with database ID: ${firebaseConfig.firestoreDatabaseId || "(default)"}`);
  } else {
    console.error("Firebase configuration missing (neither FIREBASE_CONFIG env nor firebase-applet-config.json found).");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Compliant Firestore Error Handling as required by the Firebase Integration Skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Formatting helper to convert structured JSON data into the exact required Markdown format
function formatReportMarkdown(data: any): string {
  const dateStr = data.dateRapport || "non précisée";
  
  let md = `**COMPTE RENDU — VEILLE DES MARCHÉS PUBLICS**\n`;
  md += `**Date du ${dateStr}**\n`;
  md += `*Secteurs Informatique & Énergie*\n\n`;
  
  // Section 1
  md += `**1. CONCURRENCE — MARCHÉS DÉJÀ ATTRIBUÉS**\n`;
  md += `${data.analyseConcurrence || "Aucune analyse de la concurrence disponible."}\n\n`;
  
  const atts = data.attributions || [];
  const validAtts = atts.filter((a: any) => a.statut?.toLowerCase() === "attribué" || a.statut?.toLowerCase() === "attribue");
  const specialAtts = atts.filter((a: any) => a.statut?.toLowerCase() !== "attribué" && a.statut?.toLowerCase() !== "attribue");
  
  if (validAtts.length > 0) {
    md += `| Entreprise | Marché obtenu | Client | Montant |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    validAtts.forEach((a: any) => {
      md += `| ${a.entreprise || "N/A"} | ${a.marcheObtenu || "N/A"} | ${a.client || "N/A"} | ${a.montant || "N/A"} |\n`;
    });
    md += `\n`;
  } else {
    md += `*Aucun marché attribué répertorié ce jour.*\n\n`;
  }
  
  if (specialAtts.length > 0) {
    md += `*Note des lots infructueux ou annulés :*\n`;
    specialAtts.forEach((a: any) => {
      const pageStr = a.page ? ` (Page ${a.page})` : "";
      md += `- **${a.client || "Client non précisé"}** : Le marché pour "${a.marcheObtenu || "objet non précisé"}" attribué initialement à ${a.entreprise || "N/A"} est déclaré **${a.statut || "Infructueux"}**${pageStr}.\n`;
    });
    md += `\n`;
  }
  
  // Section 2
  md += `**2. OPPORTUNITÉS EN COURS — À SUIVRE**\n`;
  const opps = data.opportunites || [];
  if (opps.length > 0) {
    opps.forEach((o: any, idx: number) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C...
      md += `${letter}. **${o.client || "Client non précisé"}**\n`;
      md += `- **Échéance** : ${o.echeance || "non précisée"}\n`;
      md += `- **Action** : ${o.action || "non précisée"}\n`;
      md += `- **Détails/Lots/Points clés** : ${o.details || "non précisé"}\n\n`;
    });
  } else {
    md += `*Aucune nouvelle opportunité détectée ce jour.*\n\n`;
  }
  
  // Section 3
  md += `**3. SYNTHÈSE DES OPPORTUNITÉS**\n`;
  if (opps.length > 0) {
    md += `| Client | Objet | Échéance | Points clés | Page |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    opps.forEach((o: any) => {
      md += `| ${o.client || "N/A"} | ${o.objet || "N/A"} | ${o.echeance || "N/A"} | ${o.details || "N/A"} | ${o.page || "N/A"} |\n`;
    });
    md += `\n`;
  } else {
    md += `*Aucune synthèse à afficher.*\n\n`;
  }
  
  // Section 4
  md += `**4. ALERTES ET INFORMATIONS DIVERSES**\n`;
  const alerts = data.alertes || [];
  if (alerts.length > 0) {
    alerts.forEach((alert: string) => {
      md += `- ${alert}\n`;
    });
    md += `\n`;
  } else {
    md += `- Aucune alerte ou information diverse à signaler.\n\n`;
  }
  
  // Recommandation
  md += `**Recommandation**\n`;
  md += `> ${data.recommandation || "Aucune recommandation formulée pour aujourd'hui."}\n`;
  
  return md;
}

// API Routes

// Route to generate a structured report from PDF base64 file
app.post("/api/generate-report", async (req, res) => {
  try {
    const { file, mimeType, fileName } = req.body;
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier n'a été fourni." });
    }

    const cleanMimeType = mimeType || "application/pdf";
    console.log(`Processing file ${fileName || "document"} with size ${file.length} bytes...`);

    const pdfPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: file
      }
    };

    const promptText = `
      Analyse très attentivement ce document PDF du "Quotidien des Marchés Publics" du Burkina Faso.
      Tu dois extraire UNIQUEMENT les informations pertinentes aux secteurs :
      1. INFORMATIQUE (matériel informatique, serveurs, réseaux, logiciels, progiciels, maintenance informatique, câblage réseau, télécoms, prestations intellectuelles informatiques, etc.)
      2. ÉNERGIE & ÉLECTRICITÉ & CLIMATISATION (Tu dois veiller à repérer et à inclure tous les marchés en rapport avec les **groupes électrogènes**, les **installations de climatiseurs / climatisation / froid / systèmes de refroidissement (CVC)**, ainsi que les **lampadaires ou l'éclairage solaire / public solaire**, en plus de l'énergie solaire photovoltaïque générale, des onduleurs, de l'électricité générale, de la maintenance de ces installations, etc.)

      ATTENTION : Les installations de climatisation, contrats de climatiseurs, climatisation technique, entretien de systèmes de climatisation, froid et climatisation font STRICTEMENT partie de ton périmètre d'extraction. Ne les ignore pas sous prétexte qu'ils ressemblent à du BTP ou du second œuvre. Ils doivent impérativement être extraits.

      IMPORTANT : Ignore absolument tout le reste (BTP général, gros œuvre routier, fournitures de bureau générales, matériels roulants ordinaires, mobilier, bourses d'études, etc.).

      Extrais les informations de manière exhaustive selon la structure JSON suivante :
      - dateRapport : La date de parution du quotidien (ex: "15 juillet 2026"). Trouve-la sur la première page.
      - analyseConcurrence : Un paragraphe court (2-3 phrases) d'analyse de la concurrence de la journée (ex: qui a gagné les plus gros lots, quelles sont les tendances d'attribution informatique/énergie/climatisation).
      - attributions : Tableau des attributions (lots gagnés, ou déclarés infructueux ou annulés). Chaque attribution contient :
        - entreprise : Nom de l'attributaire (ex: "PRODITEK"). Si infructueux ou annulé, mets "N/A" ou "Aucun".
        - marcheObtenu : Objet ou libellé précis du marché.
        - client : L'autorité contractante (ex: "Ministère de l'Énergie").
        - montant : Montant attribué (généralement en FCFA, ex: "24 500 000 FCFA TTC"). Indique "non précisé" si absent.
        - statut : "Attribué", "Infructueux" ou "Annulé".
        - page : Numéro de page dans le PDF source.
      - opportunites : Tableau des opportunités en cours (Appels d'offres publics, Demandes de prix, Manifestations d'intérêt) à suivre. Chaque opportunité contient :
        - client : L'autorité contractante (ex: "SONABEL").
        - objet : Objet de l'opportunité.
        - echeance : Date et heure limite (ex: "25/08/2026 à 09h00").
        - action : Instructions pour participer (ex: "Retrait du dossier au secrétariat de la SONABEL, coût 50 000 FCFA non remboursable").
        - details : Détails des lots ou critères importants (ex: "Lot 1: Acquisition d'onduleurs 10kVA, Lot 2: Climatiseurs split 18000 BTU, Lot 3: Batteries").
        - page : Numéro de page dans le PDF source.
      - alertes : Liste de chaînes de caractères (additifs, reports de dates, annulations de procédures, visites de sites obligatoires, réunions préparatoires, etc.).
      - recommandation : 1 ou 2 phrases de recommandation stratégique sur les opportunités clés à saisir en priorité (ex: cibler l'AO de la SONABEL en priorité vu l'échéance courte).

      Sois extrêmement rigoureux. Ne crée pas de fausses données. S'il n'y a aucune information pertinente pour les rubriques attributions ou opportunités, renvoie un tableau vide [].
    `;

    // Define JSON schema for structured output using Type from @google/genai
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        dateRapport: {
          type: Type.STRING,
          description: "La date du journal de marchés publics extrait (ex: '15 juillet 2026')."
        },
        analyseConcurrence: {
          type: Type.STRING,
          description: "Un paragraphe court d'analyse concurrentielle des attributions du jour."
        },
        attributions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              entreprise: { type: Type.STRING, description: "Nom de l'entreprise attributaire ou 'N/A'." },
              marcheObtenu: { type: Type.STRING, description: "Description ou objet du marché." },
              client: { type: Type.STRING, description: "L'autorité contractante." },
              montant: { type: Type.STRING, description: "Montant du marché avec devise (ex: '45 000 000 FCFA')." },
              statut: { type: Type.STRING, description: "Statut du marché ('Attribué', 'Infructueux', 'Annulé')." },
              page: { type: Type.STRING, description: "Numéro de page dans le PDF." }
            },
            required: ["entreprise", "marcheObtenu", "client", "montant", "statut", "page"]
          }
        },
        opportunites: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              client: { type: Type.STRING, description: "L'entité qui lance l'avis." },
              objet: { type: Type.STRING, description: "L'objet exact de l'appel d'offres." },
              echeance: { type: Type.STRING, description: "Date et heure limite de dépôt." },
              action: { type: Type.STRING, description: "Comment et où retirer/déposer le dossier, coût éventuel." },
              details: { type: Type.STRING, description: "Détails des lots ou spécifications clés." },
              page: { type: Type.STRING, description: "Numéro de page dans le PDF." }
            },
            required: ["client", "objet", "echeance", "action", "details", "page"]
          }
        },
        alertes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Liste des alertes importantes comme des reports, des additifs ou visites de sites obligatoires."
        },
        recommandation: {
          type: Type.STRING,
          description: "1 ou 2 phrases de recommandation d'action immédiate pour le cabinet."
        }
      },
      required: ["dateRapport", "analyseConcurrence", "attributions", "opportunites", "alertes", "recommandation"]
    };

    console.log("Calling Gemini API for extraction...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [pdfPart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // low temperature for precise extraction
      }
    });

    const jsonText = response.text;
    console.log("Gemini extraction complete! Parsing JSON...");
    const parsedData = JSON.parse(jsonText.trim());

    // Clean up empty fields and format date if needed
    if (!parsedData.dateRapport) {
      parsedData.dateRapport = new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }

    // Format the text of the report
    const formattedMarkdown = formatReportMarkdown(parsedData);

    return res.json({
      success: true,
      data: parsedData,
      markdown: formattedMarkdown
    });

  } catch (error: any) {
    console.error("Error generating report:", error);
    return res.status(500).json({ 
      error: "Une erreur est survenue lors du traitement du document.",
      details: error.message 
    });
  }
});

// Route to get all saved reports
app.get("/api/reports", async (req, res) => {
  const pathForGetDocs = "veille_reports";
  try {
    if (!db) {
      return res.status(500).json({ error: "Base de données non initialisée." });
    }
    
    const reportsCol = collection(db, pathForGetDocs);
    const q = query(reportsCol, orderBy("createdAt", "desc"));
    
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathForGetDocs);
    }
    
    const reportsList = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null
      };
    });

    return res.json(reportsList);
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({ error: "Impossible de récupérer les rapports.", details: error.message });
  }
});

// Route to save a report
app.post("/api/reports", async (req, res) => {
  const pathForWrite = "veille_reports";
  try {
    if (!db) {
      return res.status(500).json({ error: "Base de données non initialisée." });
    }

    const { dateRapport, rawData, markdown } = req.body;
    if (!dateRapport || !rawData || !markdown) {
      return res.status(400).json({ error: "Données incomplètes pour l'enregistrement." });
    }

    const reportsCol = collection(db, pathForWrite);
    
    let newDoc;
    try {
      newDoc = await addDoc(reportsCol, {
        dateRapport,
        rawData,
        markdown,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, pathForWrite);
    }

    return res.json({ success: true, id: newDoc.id });
  } catch (error: any) {
    console.error("Error saving report:", error);
    return res.status(500).json({ error: "Impossible de sauvegarder le rapport.", details: error.message });
  }
});

// Route to delete a report
app.delete("/api/reports/:id", async (req, res) => {
  const pathForDelete = "veille_reports";
  try {
    if (!db) {
      return res.status(500).json({ error: "Base de données non initialisée." });
    }

    const { id } = req.params;
    const reportDocRef = doc(db, pathForDelete, id);
    
    try {
      await deleteDoc(reportDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${pathForDelete}/${id}`);
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting report:", error);
    return res.status(500).json({ error: "Impossible de supprimer le rapport.", details: error.message });
  }
});

// Route to ask natural language questions on all saved reports
app.post("/api/ask", async (req, res) => {
  const pathForGetDocs = "veille_reports";
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "La question est requise." });
    }

    if (!db) {
      return res.status(500).json({ error: "Base de données non initialisée." });
    }

    // Retrieve all reports from DB to provide context to Gemini
    const reportsCol = collection(db, pathForGetDocs);
    const q = query(reportsCol, orderBy("createdAt", "desc"));
    
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, pathForGetDocs);
    }
    
    const reportsList = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        dateRapport: data.dateRapport,
        rawData: data.rawData
      };
    });

    if (reportsList.length === 0) {
      return res.json({ 
        answer: "Il n'y a aucun compte rendu dans la base de données pour le moment. Veuillez d'abord téléverser un quotidien pour l'analyser." 
      });
    }

    // Format the database contents as text context for Gemini
    const contextText = JSON.stringify(reportsList, null, 2);

    const promptText = `
      Tu es l'expert en intelligence artificielle d'un cabinet de conseil spécialisé en Informatique et Énergie au Burkina Faso.
      Ton rôle est d'analyser l'historique des marchés publics enregistrés dans la base et de répondre précisément à la question de l'utilisateur.

      VOICI LA QUESTION DE L'UTILISATEUR :
      "${question}"

      VOICI L'HISTORIQUE DE TOUS LES COMPTES RENDUS DE MARCHÉS PUBLICS DISPONIBLES :
      ${contextText}

      CONSIGNES IMPORTANTES POUR TA RÉPONSE :
      1. Réponds de manière professionnelle, claire et structurée en français.
      2. CITE OBLIGATOIREMENT LA DATE DU COMPTE RENDU SOURCE pour chaque fait que tu avances (ex: "Dans le rapport du 12 juillet 2026, l'entreprise X a remporté..."). C'est une obligation absolue.
      3. Ne spécule pas, base-toi uniquement sur les données fournies dans l'historique. Si l'information demandée n'est pas présente dans l'historique ou si aucun rapport n'y correspond, indique-le humblement ("Désolé, je ne trouve pas cette information dans l'historique des rapports disponibles").
      4. Si la question demande des comparaisons (ex: entre juin et juillet), agrège les données adéquatement en citant les dates des rapports concernés.
      5. Sois concis et va à l'essentiel tout en restant exhaustif sur les faits.
    `;

    console.log(`Asking Gemini about: "${question}" using ${reportsList.length} reports as context...`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
    });

    return res.json({
      answer: response.text
    });

  } catch (error: any) {
    console.error("Error answering question:", error);
    return res.status(500).json({ 
      error: "Une erreur est survenue lors de la génération de la réponse.", 
      details: error.message 
    });
  }
});

// Vite Middleware integration or Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware in development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
