// Download Reports Management
console.log("Loading download-reports.js file...");

// Initialize download reports functionality
function initializeDownloadReports() {
  console.log("Initializing download reports...");
  displayDownloadReportsInterface();
}

// Display download reports interface
function displayDownloadReportsInterface() {
  const contentDiv = document.getElementById("download-reports-content");
  if (!contentDiv) {
    console.error("download-reports-content div not found");
    return;
  }

  contentDiv.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="text-primary mb-0"><i class="fas fa-download me-2"></i>Download Reports</h2>
          </div>

          <!-- Student Registrations Report -->
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="card-title mb-0"><i class="fas fa-user-graduate me-2"></i>Student Registrations Report</h5>
            </div>
            <div class="card-body">
              <p class="text-muted mb-3">Download all student course registration data including enrollment numbers, courses, slots, faculty, and venues.</p>

              <div class="row">
                <div class="col-md-6">
                  <label class="form-label">Select Download Format</label>
                  <div class="btn-group d-flex" role="group">
                    <button type="button" class="btn btn-outline-success" onclick="downloadRegistrations('excel')">
                      <i class="fas fa-file-excel me-2"></i>Excel (.xlsx)
                    </button>
                    <button type="button" class="btn btn-outline-info" onclick="downloadRegistrations('csv')">
                      <i class="fas fa-file-csv me-2"></i>CSV
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="downloadRegistrations('both')">
                      <i class="fas fa-file-archive me-2"></i>Both
                    </button>
                  </div>
                </div>
              </div>

              <div id="download-status" class="mt-3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Download student registrations
async function downloadRegistrations(format) {
  const statusDiv = document.getElementById("download-status");
  statusDiv.innerHTML = `
    <div class="alert alert-info">
      <i class="fas fa-spinner fa-spin me-2"></i>Preparing download...
    </div>
  `;

  try {
    const response = await fetch(
      `${window.API_URL}/reports/student-registrations?format=${format}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-access-token": localStorage.getItem("token"),
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to download report");
    }

    if (format === "both") {
      // Handle JSON response with both files as base64
      const data = await response.json();

      // Download Excel
      downloadBase64File(
        data.excel.data,
        data.excel.filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // Small delay before downloading second file
      setTimeout(() => {
        // Download CSV
        downloadBase64File(
          data.csv.data,
          data.csv.filename,
          "text/csv;charset=utf-8;"
        );
      }, 500);

      statusDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle me-2"></i>Both files downloaded successfully!
        </div>
      `;
    } else {
      // Handle blob response for single file
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename =
        format === "excel"
          ? "student_registrations.xlsx"
          : "student_registrations.csv";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      statusDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle me-2"></i>Report downloaded successfully!
        </div>
      `;
    }
  } catch (error) {
    console.error("Error downloading report:", error);
    statusDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>Error: ${error.message}
      </div>
    `;
  }
}

// Helper function to download base64 encoded file
function downloadBase64File(base64Data, filename, mimeType) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Make function available globally
window.initializeDownloadReports = initializeDownloadReports;
console.log("download-reports.js loaded successfully");
