import axios from "axios";

const MARGIN        = 50;
const PAGE_WIDTH    = 595.28;   // A4
const PAGE_HEIGHT   = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 3;

const C = {
    black:      "#1a1a1a",
    darkGray:   "#333333",
    midGray:    "#555555",
    lightGray:  "#888888",
    rule:       "#cccccc",
    ruleLight:  "#e8e8e8",
    codeBg:     "#f7f7f7",
    codeBorder: "#d0d0d0",
    codeText:   "#1a1a1a",
    headerBg:    "#f5f5f5",
    markFull:    "#2e7d32",   // green  — full marks
    markPartial: "#e65100",   // amber  — partial
    markZero:    "#c62828",   // red    — zero
};

function addHorizontalLine(doc, y, { color = C.rule, weight = 0.5 } = {}) {
    doc.save()
        .strokeColor(color)
        .lineWidth(weight)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke()
        .restore();
}


function addSectionBox(doc, title) {
    doc.font("Helvetica-Bold")
        .fontSize(8)
        .fill(C.lightGray)
        .text(title.toUpperCase(), MARGIN, doc.y, {
            characterSpacing: 1.2,
            width: CONTENT_WIDTH,
        });

    doc.moveDown(0.35);

    addHorizontalLine(doc, doc.y, { color: C.rule, weight: 0.75 });

    doc.moveDown(0.8);
    doc.font("Helvetica")
        .fontSize(10)
        .fill(C.black);
}

// Base64 Image Detection 
function isBase64Image(str) {
    if (!str || typeof str !== "string") return false;
    if (str.startsWith("data:image/")) return true;
    return /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str);
}

// Image Renderer
async function renderImage(doc, imageData, options = {}) {
    if (!imageData || typeof imageData !== "string")
        return false;
    try {
        let imgBuffer;
        if (imageData.startsWith("data:image/")) {
            const match = imageData.match(
                /^data:image\/\w+;base64,(.+)$/
            );
            if (match)
                imgBuffer = Buffer.from(match[1], "base64");
        }
        else if (imageData.startsWith("http")) {
            const response = await axios.get(imageData, {
                responseType: "arraybuffer",
            });
            imgBuffer = Buffer.from(response.data);
        }
        else {
            imgBuffer = Buffer.from(imageData, "base64");
        }
        if (!imgBuffer)
            return false;
        doc.image(imgBuffer, {
            fit: [CONTENT_WIDTH, 300],
            align: "center",
            ...options,
        });
        return true;
    } catch (err) {
        console.error("Image render failed:", err.message);
        return false;
    }
}

//Code Block Renderer 
function formatCodeBlock(doc, code) {
    const lines       = String(code).split("\n");
    const lineHeight  = 13;
    const paddingV    = 12;
    const paddingH    = 14;
    const blockX      = MARGIN + 10;
    const blockWidth  = CONTENT_WIDTH - 20;
    const blockHeight = lines.length * lineHeight + paddingV * 2;

    // Background + border
    doc.save()
        .rect(blockX, doc.y, blockWidth, blockHeight)
        .fillAndStroke(C.codeBg, C.codeBorder)
        .restore();

    // Code text
    doc.font("Courier")
        .fontSize(8.5)
        .fill(C.codeText);

    const textX    = blockX + paddingH;
    const textMaxW = blockWidth - paddingH * 2;
    const startY   = doc.y + paddingV;

    lines.forEach((line, i) => {
        doc.text(line || " ", textX, startY + i * lineHeight, {
            width:     textMaxW,
            lineBreak: false,
        });
    });

    // Advance cursor past the block
    doc.moveDown(0.6);

    // Restore body styles
    doc.font("Helvetica")
        .fontSize(10.5)
        .fill(C.black);
}

export {
    addHorizontalLine,
    addSectionBox,
    C,
    isBase64Image,
    renderImage,
    MARGIN,
    PAGE_HEIGHT,
    PAGE_WIDTH,
    CONTENT_WIDTH,
    formatCodeBlock,
};