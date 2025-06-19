document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const productTypeSelect = document.getElementById('productType');
    const extractedIngredientsTextarea = document.getElementById('extractedIngredients');
    const analyzeButton = document.getElementById('analyzeButton');
    const analysisResultDiv = document.getElementById('analysisResult');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessageDiv = document.getElementById('errorMessage');
    const downloadSection = document.querySelector('.download-section'); // New
    const downloadPdfButton = document.getElementById('downloadPdf'); // New
    const downloadPngButton = document.getElementById('downloadPng'); // New

    let uploadedImageFile = null;

    // In your local script.js file
    const API_BASE_URL = "http://localhost:8000"; // <-- MAKE SURE THIS IS EXACTLY THIS
    

    // Function to show/hide loading spinner and manage button state
    function toggleLoading(show) {
        if (show) {
            loadingSpinner.style.display = 'block';
            errorMessageDiv.style.display = 'none';
            analysisResultDiv.innerHTML = '<p>Analysis in progress...</p>';
            analyzeButton.disabled = true;
            analyzeButton.classList.add('loading');
            downloadSection.style.display = 'none'; // Hide download buttons when analyzing
        } else {
            loadingSpinner.style.display = 'none';
            analyzeButton.disabled = false;
            analyzeButton.classList.remove('loading');
        }
    }

    // Function to display error messages
    function displayError(message) {
        errorMessageDiv.textContent = `Error: ${message}`;
        errorMessageDiv.style.display = 'block';
        analysisResultDiv.innerHTML = '<p>Analysis failed. Please try again.</p>';
        downloadSection.style.display = 'none'; // Hide download buttons on error
    }

    // Handle image upload and OCR extraction
    imageUpload.addEventListener('change', async (event) => {
        uploadedImageFile = event.target.files[0];
        if (!uploadedImageFile) {
            fileNameDisplay.textContent = "";
            extractedIngredientsTextarea.value = "";
            return;
        }

        fileNameDisplay.textContent = `Selected: ${uploadedImageFile.name}`;
        extractedIngredientsTextarea.value = "Extracting text...";
        toggleLoading(true);

        const formData = new FormData();
        formData.append('image', uploadedImageFile);
        formData.append('product_type', productTypeSelect.value);

        try {
            const response = await fetch(`${API_BASE_URL}/extract`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.warning) {
                extractedIngredientsTextarea.value = data.warning;
                displayError(data.warning);
            } else {
                extractedIngredientsTextarea.value = data.ingredients || "No text extracted.";
            }
        } catch (error) {
            console.error("Error during OCR extraction:", error);
            displayError(`Failed to extract ingredients: ${error.message}`);
            extractedIngredientsTextarea.value = "Failed to extract ingredients.";
        } finally {
            toggleLoading(false);
        }
    });

    // Handle ingredient analysis
    analyzeButton.addEventListener('click', async () => {
        const ingredientsText = extractedIngredientsTextarea.value.trim();
        const productType = productTypeSelect.value;

        if (!ingredientsText || ingredientsText === "No text extracted." || ingredientsText === "Extracting text..." || ingredientsText.startsWith("Failed to extract ingredients")) {
            displayError("Please upload an image and ensure ingredients are extracted before analyzing.");
            return;
        }

        toggleLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ingredients: ingredientsText,
                    product_type: productType
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.result || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            analysisResultDiv.innerHTML = data.result;
            downloadSection.style.display = 'block'; // Show download buttons after successful analysis
        } catch (error) {
            console.error("Error during analysis:", error);
            displayError(`Failed to analyze ingredients: ${error.message}`);
            downloadSection.style.display = 'none'; // Ensure buttons are hidden on analysis failure
        } finally {
            toggleLoading(false);
        }
    });

    // --- Download Functionality ---

    // Download as PDF
    downloadPdfButton.addEventListener('click', async () => {
        const { jsPDF } = window.jspdf; // Get jsPDF from window object
        const content = document.getElementById('analysisResult');

        // Show a temporary message to the user
        alert('Generating PDF... This may take a moment.');

        try {
            const canvas = await html2canvas(content, {
                scale: 2, // Increase scale for better quality in PDF
                useCORS: true, // If analysisResult contains images from other domains
                logging: false // Disable logging for cleaner console
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' for size
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('GlowScan_Analysis.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again or check console for details.');
        }
    });

    // Download as PNG
    downloadPngButton.addEventListener('click', async () => {
        const content = document.getElementById('analysisResult');

        // Show a temporary message to the user
        alert('Generating PNG image... This may take a moment.');

        try {
            const canvas = await html2canvas(content, {
                scale: 2, // Increase scale for better quality
                useCORS: true,
                logging: false
            });

            const link = document.createElement('a');
            link.download = 'GlowScan_Analysis.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error generating PNG:', error);
            alert('Failed to generate PNG. Please try again or check console for details.');
        }
    });
});