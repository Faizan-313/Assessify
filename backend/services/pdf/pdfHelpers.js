function addHorizontalLine(doc, y) {
    doc.strokeColor('#e0e0e0')
       .lineWidth(1)
       .moveTo(60, y)
       .lineTo(535, y)
       .stroke();
}

function addSectionBox(doc, title) {
    doc.rect(60, doc.y, 475, 25)
       .fill('#2c3e50');
    doc.fill('#ffffff')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(title, 70, doc.y - 19);
    doc.fill('#000000')
       .font('Helvetica');
    doc.moveDown(2);
}

function isBase64Image(str) {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('data:image/') || /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str);
}

function renderImage(doc, imageData, options = {}) {
    try {
        let imgBuffer;
        if (typeof imageData !== 'string') {
            return false;
        }

        if (imageData.startsWith('data:image/')) {
            const matches = imageData.match(/^data:image\/\w+;base64,(.+)$/);
            if (matches) {
                imgBuffer = Buffer.from(matches[1], 'base64');
            }
        } else if (imageData.startsWith('http')) {
            // External image URLs are not rendered in this service.
            return false;
        } else {
            imgBuffer = Buffer.from(imageData, 'base64');
        }

        if (imgBuffer) {
            const defaultOptions = { fit: [400, 300], align: 'center' };
            doc.image(imgBuffer, { ...defaultOptions, ...options });
            return true;
        }
    } catch (err) {
        return false;
    }
    return false;
}

function formatCodeBlock(doc, code) {
    const codeWidth = 400;
    const codeX = 80;
    const codeLines = String(code).split('\n');
    const lineHeight = 14;
    const padding = 15;
    const codeHeight = (codeLines.length * lineHeight) + (padding * 2);

    doc.rect(codeX - 5, doc.y - 5, codeWidth + 10, codeHeight)
       .fill('#f8f9fa')
       .stroke('#dee2e6');

    doc.fill('#2c3e50')
       .font('Courier')
       .fontSize(9);

    codeLines.forEach((line, i) => {
        doc.text(
            line || ' ',
            codeX,
            doc.y + (i === 0 ? padding : 0),
            {
                width: codeWidth - 10,
                lineBreak: false,
            }
        );
    });

    doc.moveDown(codeLines.length * 0.5 + 1);
    doc.font('Helvetica')
       .fontSize(11)
       .fill('#000000');
}

export {
    addHorizontalLine,
    addSectionBox,
    isBase64Image,
    renderImage,
    formatCodeBlock,
};
