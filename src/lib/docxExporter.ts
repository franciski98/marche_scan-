import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  HeadingLevel, 
  WidthType, 
  BorderStyle,
  AlignmentType,
  ShadingType
} from "docx";

// Function to generate and trigger the download of a DOCX file
export async function exportReportToDocx(data: any) {
  const dateStr = data.dateRapport || "non précisée";

  // Define some styles and table configurations
  const tableCellMargins = {
    top: 100,
    bottom: 100,
    left: 150,
    right: 150,
  };

  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
  };

  const headerShading = {
    fill: "1B365D",
    type: ShadingType.CLEAR,
    color: "auto",
  };

  // Build Document sections children
  const children: any[] = [];

  // Header / Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: "COMPTE RENDU — VEILLE DES MARCHÉS PUBLICS",
          bold: true,
          font: "Calibri",
          size: 32, // 16pt
          color: "1B365D",
        }),
      ],
      spacing: { after: 120 },
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Date du ${dateStr}`,
          bold: true,
          font: "Calibri",
          size: 24, // 12pt
          color: "1B365D",
        }),
      ],
      spacing: { after: 60 },
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Secteurs Informatique & Énergie",
          italics: true,
          font: "Calibri",
          size: 22, // 11pt
          color: "475569",
        }),
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
    })
  );

  // SECTION 1: CONCURRENCE
  children.push(
    new Paragraph({
      shading: {
        fill: "1B365D",
      },
      indent: {
        left: 144,
        right: 144,
      },
      children: [
        new TextRun({
          text: "1. CONCURRENCE — MARCHÉS DÉJÀ ATTRIBUÉS",
          bold: true,
          font: "Calibri",
          size: 24, // 12pt
          color: "FFFFFF",
        }),
      ],
      spacing: { before: 240, after: 120 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.analyseConcurrence || "Aucune analyse disponible.",
          font: "Calibri",
          size: 22,
          color: "334155",
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Table of Attributions
  const atts = data.attributions || [];
  const validAtts = atts.filter((a: any) => a.statut?.toLowerCase() === "attribué" || a.statut?.toLowerCase() === "attribue");
  const specialAtts = atts.filter((a: any) => a.statut?.toLowerCase() !== "attribué" && a.statut?.toLowerCase() !== "attribue");

  if (validAtts.length > 0) {
    const tableRows = [
      // Table Header Row
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Entreprise", bold: true, font: "Calibri", size: 20, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Marché obtenu", bold: true, font: "Calibri", size: 20, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Client", bold: true, font: "Calibri", size: 20, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Montant", bold: true, font: "Calibri", size: 20, color: "FFFFFF" })] })],
          }),
        ],
      }),
    ];

    validAtts.forEach((a: any) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: a.entreprise || "N/A", font: "Calibri", size: 20 })] })],
            }),
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: a.marcheObtenu || "N/A", font: "Calibri", size: 20 })] })],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: a.client || "N/A", font: "Calibri", size: 20 })] })],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: a.montant || "N/A", font: "Calibri", size: 20 })] })],
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorder,
      })
    );
    
    // spacing after table
    children.push(new Paragraph({ spacing: { after: 200 } }));
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Aucun marché attribué répertorié ce jour.",
            italics: true,
            font: "Calibri",
            size: 20,
            color: "64748B",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  if (specialAtts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Notes d'attributions (lots infructueux ou annulés) :",
            bold: true,
            font: "Calibri",
            size: 20,
            color: "475569",
          }),
        ],
        spacing: { before: 120, after: 60 },
      })
    );

    specialAtts.forEach((a: any) => {
      const pageStr = a.page ? ` (Page ${a.page})` : "";
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${a.client || "Client non précisé"} : `, bold: true, font: "Calibri", size: 20 }),
            new TextRun({ text: `Le marché pour "${a.marcheObtenu || "objet non précisé"}" attribué initialement à ${a.entreprise || "N/A"} est déclaré `, font: "Calibri", size: 20 }),
            new TextRun({ text: a.statut || "Infructueux", bold: true, font: "Calibri", size: 20 }),
            new TextRun({ text: `${pageStr}.`, font: "Calibri", size: 20 }),
          ],
          spacing: { after: 60 },
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // SECTION 2: OPPORTUNITIES
  children.push(
    new Paragraph({
      shading: {
        fill: "1B365D",
      },
      indent: {
        left: 144,
        right: 144,
      },
      children: [
        new TextRun({
          text: "2. OPPORTUNITÉS EN COURS — À SUIVRE",
          bold: true,
          font: "Calibri",
          size: 24,
          color: "FFFFFF",
        }),
      ],
      spacing: { before: 240, after: 120 },
    })
  );

  const opps = data.opportunites || [];
  if (opps.length > 0) {
    opps.forEach((o: any, idx: number) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C...
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${letter}. ${o.client || "Client non précisé"}`,
              bold: true,
              font: "Calibri",
              size: 22,
              color: "0F172A",
            }),
          ],
          spacing: { before: 100, after: 60 },
        })
      );

      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: "Échéance : ", bold: true, font: "Calibri", size: 20 }),
            new TextRun({ text: o.echeance || "non précisée", font: "Calibri", size: 20 }),
          ],
          spacing: { after: 40 },
        })
      );

      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: "Action : ", bold: true, font: "Calibri", size: 20 }),
            new TextRun({ text: o.action || "non précisée", font: "Calibri", size: 20 }),
          ],
          spacing: { after: 40 },
        })
      );

      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: "Détails/Lots/Points clés : ", bold: true, font: "Calibri", size: 20 }),
            new TextRun({ text: o.details || "non précisé", font: "Calibri", size: 20 }),
          ],
          spacing: { after: 120 },
        })
      );
    });
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Aucune opportunité disponible pour aujourd'hui.",
            italics: true,
            font: "Calibri",
            size: 20,
            color: "64748B",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // SECTION 3: SYNTHESIS OF OPPORTUNITIES
  children.push(
    new Paragraph({
      shading: {
        fill: "1B365D",
      },
      indent: {
        left: 144,
        right: 144,
      },
      children: [
        new TextRun({
          text: "3. SYNTHÈSE DES OPPORTUNITÉS",
          bold: true,
          font: "Calibri",
          size: 24,
          color: "FFFFFF",
        }),
      ],
      spacing: { before: 240, after: 120 },
    })
  );

  if (opps.length > 0) {
    const synthRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Client", bold: true, font: "Calibri", size: 18, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Objet", bold: true, font: "Calibri", size: 18, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Échéance", bold: true, font: "Calibri", size: 18, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Points clés", bold: true, font: "Calibri", size: 18, color: "FFFFFF" })] })],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            margins: tableCellMargins,
            shading: headerShading,
            children: [new Paragraph({ children: [new TextRun({ text: "Page", bold: true, font: "Calibri", size: 18, color: "FFFFFF" })] })],
          }),
        ],
      }),
    ];

    opps.forEach((o: any) => {
      synthRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: o.client || "N/A", font: "Calibri", size: 18 })] })],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: o.objet || "N/A", font: "Calibri", size: 18 })] })],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: o.echeance || "N/A", font: "Calibri", size: 18 })] })],
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: o.details || "N/A", font: "Calibri", size: 18 })] })],
            }),
            new TableCell({
              width: { size: 8, type: WidthType.PERCENTAGE },
              margins: tableCellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: o.page || "N/A", font: "Calibri", size: 18 })] })],
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: synthRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorder,
      })
    );
    children.push(new Paragraph({ spacing: { after: 200 } }));
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Aucune opportunité pour alimenter la synthèse.",
            italics: true,
            font: "Calibri",
            size: 20,
            color: "64748B",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // SECTION 4: ALERTS
  children.push(
    new Paragraph({
      shading: {
        fill: "1B365D",
      },
      indent: {
        left: 144,
        right: 144,
      },
      children: [
        new TextRun({
          text: "4. ALERTES ET INFORMATIONS DIVERSES",
          bold: true,
          font: "Calibri",
          size: 24,
          color: "FFFFFF",
        }),
      ],
      spacing: { before: 240, after: 120 },
    })
  );

  const alerts = data.alertes || [];
  if (alerts.length > 0) {
    alerts.forEach((alert: string) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: alert,
              font: "Calibri",
              size: 20,
              color: "334155",
            }),
          ],
          spacing: { after: 60 },
        })
      );
    });
    children.push(new Paragraph({ spacing: { after: 200 } }));
  } else {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({
            text: "Aucune alerte ou information diverse à signaler.",
            font: "Calibri",
            size: 20,
            color: "64748B",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // SECTION: RECOMMENDATIONS
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Recommandation",
          bold: true,
          font: "Calibri",
          size: 24,
          color: "1B365D",
        }),
      ],
      spacing: { before: 240, after: 120 },
    })
  );

  children.push(
    new Paragraph({
      shading: {
        fill: "E0F7FA",
      },
      indent: {
        left: 144,
        right: 144,
      },
      children: [
        new TextRun({
          text: data.recommandation || "Aucune recommandation disponible.",
          font: "Calibri",
          size: 22,
          color: "083344", // Deep cyan text
          italics: true,
        }),
      ],
      spacing: { before: 120, after: 400 },
    })
  );

  // Assemble and package the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  // Format file name
  const safeDate = dateStr.replace(/[^a-zA-Z0-9]/g, "_");
  a.download = `Compte_Rendu_Veille_Marches_${safeDate}.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
