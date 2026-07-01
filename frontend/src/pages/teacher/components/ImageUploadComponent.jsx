import toast from 'react-hot-toast';
import { ImagePlus, FileImage, X, Check } from 'lucide-react';

const ImageUploadComponent = ({
    questions,
    setQuestions,
    index,
    imageField = "image",
    previewField = "imagePreview",
    label = "Question Image",
    emptyText = "No image uploaded",
}) => {

    const getImageFileName = (img, index) => {
        if (!img) return "";
        return typeof img === 'string' ? `image-${index + 1}` : img.name || "image";
    };

    const getImageSizeText = (img) => {
        if (!img) return null;
        if (typeof img === 'string') {
            const parts = img.split(',');
            const b64 = parts[1] || '';
            const sizeBytes = Math.ceil((b64.length * 3) / 4);
            return `${(sizeBytes / 1024).toFixed(2)} KB`;
        }
        if (img.size) return `${(img.size / 1024).toFixed(2)} KB`;
        return null;
    };

    const handleFileSelect = (index, event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('File size must be less than 2MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            const updatedQuestions = [...questions];
            const prevPreview = updatedQuestions[index]?.[previewField];
            if (prevPreview && typeof prevPreview === 'string' && prevPreview.startsWith('blob:')) {
                try { URL.revokeObjectURL(prevPreview); } catch { /* ignore */ }
            }

            updatedQuestions[index] = {
                ...updatedQuestions[index],
                [imageField]: file,
                [previewField]: previewUrl
            };
            setQuestions(updatedQuestions);
        }
    };

    const handleRemove = (index) => {
        const updatedQuestions = [...questions];
        const prev = updatedQuestions[index]?.[previewField];
        if (prev && typeof prev === 'string' && prev.startsWith('blob:')) {
            try { URL.revokeObjectURL(prev); } catch { /* ignore */ }
        }
        updatedQuestions[index] = {
            ...updatedQuestions[index],
            [imageField]: null,
            [previewField]: null
        };
        setQuestions(updatedQuestions);
    };

    const question = questions?.[index];
    if (!question) return null;

    const image = question[imageField];
    const preview = question[previewField];
    const sizeText = getImageSizeText(image);
    const inputId = `${imageField}-fileUpload-${index}`;

    return (
        <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <label
                htmlFor={inputId}
                className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider"
            >
                <ImagePlus className="w-3.5 h-3.5 text-violet-400" />
                {label}
                <span className="text-gray-500 normal-case font-normal tracking-normal">(optional)</span>
            </label>

            <input
                type="file"
                id={inputId}
                accept="image/*"
                onChange={(e) => handleFileSelect(index, e)}
                className="block w-full text-sm text-gray-400
                    file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0
                    file:bg-gradient-to-r file:from-indigo-500 file:to-violet-600
                    hover:file:from-indigo-400 hover:file:to-violet-500
                    file:text-white file:font-semibold file:cursor-pointer
                    file:transition-all file:shadow-md file:shadow-violet-500/20
                    cursor-pointer"
            />

            {preview ? (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
                    <div className="flex items-start gap-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-28 h-28 object-cover rounded-lg border border-white/10 shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 mb-1">
                                <Check className="w-4 h-4" />
                                Image Selected
                            </p>
                            <p className="text-xs text-gray-300 truncate" title={getImageFileName(image, index)}>
                                {getImageFileName(image, index)}
                            </p>
                            {sizeText && (
                                <p className="text-xs text-gray-500 mb-3">{sizeText}</p>
                            )}
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 transition-all"
                            >
                                <X className="w-3 h-3" />
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-4 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                    <FileImage className="w-10 h-10 text-violet-400/60 mx-auto mb-2" />
                    <p className="text-sm text-gray-300 font-medium mb-0.5">{emptyText}</p>
                    <p className="text-xs text-gray-500">Supported formats: JPG, PNG · Max 2MB</p>
                </div>
            )}
        </div>
    );
};

export default ImageUploadComponent;
