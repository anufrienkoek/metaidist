import { Program, SECTION_LABELS, SectionKey } from "../types";
import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    AlignmentType, 
    PageNumber, 
    Header, 
    PageBreak,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    WidthType
} from "docx";
import FileSaver from "file-saver";

// --- Helpers ---

// Parses a pipe-separated string into an array of cell strings
const parseRow = (rowLine: string): string[] => {
    const cleanLine = rowLine.trim();
    // Split by pipe
    let parts = cleanLine.split('|');
    
    // If line starts with pipe (e.g. "| A | B |"), the first item is empty.
    if (cleanLine.startsWith('|')) {
        parts.shift();
    }
    // If line ends with pipe, the last item is empty.
    if (cleanLine.endsWith('|')) {
        parts.pop();
    }
    
    return parts.map(p => p.trim());
};

// Creates a docx Table from an array of markdown table lines
const createTableFromLines = (lines: string[], fontFamily: string, fontSize: number): Table | null => {
    if (lines.length < 2) return null;

    // Line 0 is Header
    // Line 1 is Separator (ignore content, just check validity)
    
    // Basic validation: Line 1 should contain hyphens
    if (!lines[1].includes('-')) return null;

    const headerCells = parseRow(lines[0]);
    const bodyLines = lines.slice(2); 
    const bodyRows = bodyLines.map(line => parseRow(line));

    // Determine column count (max of header or any body row)
    let maxCols = headerCells.length;
    bodyRows.forEach(r => maxCols = Math.max(maxCols, r.length));

    if (maxCols === 0) return null;

    const allRowsData = [headerCells, ...bodyRows];

    const tableRows = allRowsData.map((rowData, rowIndex) => {
        const isHeader = rowIndex === 0;
        
        const cells = rowData.map(cellText => new TableCell({
            children: [new Paragraph({
                children: [new TextRun({
                    text: cellText,
                    font: fontFamily,
                    size: fontSize * 2,
                    bold: isHeader,
                })],
                alignment: AlignmentType.CENTER // Center text in cells
            })],
            borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            width: {
                size: 100 / maxCols,
                type: WidthType.PERCENTAGE,
            },
            shading: isHeader ? { fill: "F2F2F2" } : undefined // Light gray header
        }));

        // Fill missing cells to ensure row is valid
        while(cells.length < maxCols) {
            cells.push(new TableCell({ 
                children: [], 
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                },
                width: { size: 100/maxCols, type: WidthType.PERCENTAGE }
            }));
        }

        return new TableRow({ children: cells });
    });

    return new Table({
        rows: tableRows,
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        }
    });
};

// Parses mixed content (text + markdown tables) into DOCX nodes
const parseContentToDocxNodes = (text: string, formatting: any): (Paragraph | Table)[] => {
    const nodes: (Paragraph | Table)[] = [];
    // Split by regex to handle both \n and \r\n
    const lines = text.split(/\r?\n/);
    
    let currentTextBuffer: string[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    const getAlignment = (align: string) => {
        switch (align) {
          case 'center': return AlignmentType.CENTER;
          case 'justified': return AlignmentType.JUSTIFIED;
          case 'left': 
          default: return AlignmentType.LEFT;
        }
    };

    const flushText = () => {
        if (currentTextBuffer.length > 0) {
            currentTextBuffer.forEach(line => {
                 if (line.trim()) {
                     nodes.push(new Paragraph({
                        alignment: getAlignment(formatting.alignment),
                        spacing: { 
                            line: formatting.lineSpacing * 240,
                            after: 120 
                        },
                        children: [new TextRun({ 
                            text: line.trim(), 
                            font: formatting.fontFamily,
                            size: formatting.fontSize * 2
                        })]
                     }));
                 }
            });
            currentTextBuffer = [];
        }
    };

    const flushTable = () => {
         if (tableBuffer.length > 0) {
             const table = createTableFromLines(tableBuffer, formatting.fontFamily, formatting.fontSize);
             if (table) {
                 nodes.push(table);
                 // Add space after table
                 nodes.push(new Paragraph({ text: "" }));
             } else {
                 // Fallback: If parsing failed, treat as text
                 tableBuffer.forEach(line => {
                     nodes.push(new Paragraph({
                         children: [new TextRun({ 
                            text: line,
                            font: formatting.fontFamily,
                            size: formatting.fontSize * 2
                         })]
                     }));
                 });
             }
             tableBuffer = [];
         }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i+1]?.trim();

        // Improved Table Detection
        // 1. Line starts with |
        // 2. Next line is a separator (contains dashes, may contain pipes/colons)
        const isTableStart = !inTable && 
                             line.startsWith('|') && 
                             nextLine && 
                             nextLine.includes('-');

        if (isTableStart) {
            flushText(); 
            inTable = true;
            tableBuffer.push(line); 
            continue;
        }

        if (inTable) {
            // Check if table ended
            // If empty line, or line does not start with |, assume end of table.
            if (!line) {
                flushTable();
                inTable = false;
            } else if (!line.startsWith('|')) {
                // If it doesn't look like a table row anymore
                flushTable();
                inTable = false;
                currentTextBuffer.push(line);
            } else {
                tableBuffer.push(line);
            }
        } else {
            currentTextBuffer.push(line);
        }
    }
    
    if (inTable) flushTable();
    else flushText();

    return nodes;
};


// --- Export Function ---

export const exportToDocx = async (program: Program) => {
  const { formatting, sections } = program;

  const cmToTwips = (cm: number) => Math.round(cm * 567);
  
  // Create document sections
  const docSections = [];

  // 1. Title Page
  docSections.push({
    properties: {
      page: {
        margin: {
          top: cmToTwips(formatting.marginTop),
          bottom: cmToTwips(formatting.marginBottom),
          left: cmToTwips(formatting.marginLeft),
          right: cmToTwips(formatting.marginRight),
        },
      },
    },
    children: [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000 }, // Push title down
            children: [
                new TextRun({
                    text: sections.titlePage,
                    font: formatting.fontFamily,
                    size: formatting.fontSize * 2,
                    bold: true,
                })
            ]
        }),
        new Paragraph({
            children: [new PageBreak()],
        }) 
    ],
  });

  // 2. Main Content
  const mainContentChildren: (Paragraph | Table)[] = [];
  
  const sectionKeys: SectionKey[] = [
    'explanatoryNote',
    'goal',
    'tasks',
    'results',
    'curriculum',
    'assessment',
    'literature'
  ];

  sectionKeys.forEach((key) => {
    // Add Section Header
    // FIX: Removed 'text' property to avoid duplicate rendering. Only 'children' used.
    mainContentChildren.push(
      new Paragraph({
        heading: "Heading1",
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [
            new TextRun({
                text: SECTION_LABELS[key].toUpperCase(),
                font: formatting.fontFamily,
                size: formatting.headingSize * 2,
                bold: formatting.headingBold,
            })
        ]
      })
    );

    const sectionContent = sections[key];
    const nodes = parseContentToDocxNodes(sectionContent, formatting);
    mainContentChildren.push(...nodes);
    
    // Add spacing between sections
    mainContentChildren.push(new Paragraph({ text: "", spacing: { after: 240 } })); 
  });

  // Construct the document
  const doc = new Document({
    sections: [
        {
            properties: {
                page: {
                    margin: {
                        top: cmToTwips(formatting.marginTop),
                        bottom: cmToTwips(formatting.marginBottom),
                        left: cmToTwips(formatting.marginLeft),
                        right: cmToTwips(formatting.marginRight),
                    }
                }
            },
            headers: {
                default: new Header({
                    children: formatting.showPageNumbers ? [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({
                                    children: ["Стр. ", PageNumber.CURRENT],
                                    font: formatting.fontFamily,
                                    size: 10 * 2
                                }),
                            ],
                        }),
                    ] : [],
                }),
            },
            children: docSections[0].children.concat(mainContentChildren)
        }
    ]
  });

  const blob = await Packer.toBlob(doc);
  FileSaver.saveAs(blob, `${program.name.replace(/\s+/g, '_')}_Program.docx`);
};